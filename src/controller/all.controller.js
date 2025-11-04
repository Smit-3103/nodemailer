import { sheets, SPREADSHEET_ID } from '../config/googleClient.js';
import { sendEmail } from '../Middleware/sendEmail.middleware.js'; // Adjust path as needed

// -----------------------------------------------------------------
// THIS IS THE SLOW PART - IT RUNS IN THE BACKGROUND
// -----------------------------------------------------------------
async function runEmailBatch(netRecipients) {
  console.log(`✅ Background job started: Sending to ${netRecipients.length} users.`);
  let results = [];

  try {
    for (let i = 0; i < netRecipients.length; i++) {
      const user = netRecipients[i];
      try {
        await sendEmail(user.email, user.firstName, user.id);
        results.push({ id: user.id, status: "sent" });
        console.log(`✅ Sent to ${user.email}`);
      } catch (err) {
        results.push({ id: user.id, status: "failed", error: err.message });
        console.error(`❌ Failed for ${user.email}: ${err.message}`);
      }

      // wait 5 minutes before next email, except after the last one
      if (i < netRecipients.length - 1) {
        console.log("⏳ Waiting 5 minutes before next email...");
        await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000));
      }
    }

    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    console.log(`✅ Background job finished. Sent: ${sentCount}, Failed: ${failedCount}`);

  } catch (batchError) {
    console.error("❌ A critical error occurred during the email batch:", batchError);
  }
}

// -----------------------------------------------------------------
// THIS IS THE FAST PART - THE API CONTROLLER
// -----------------------------------------------------------------
const emailSender = async (req, res) => {
  try {
    // 4.1. Authenticate... (uncomment if you need it)

    console.log("SPREADSHEET_ID :", SPREADSHEET_ID);

    // 4.2. Read the suppression list (Unsubscribed sheet)
    const unsubscribedData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Unsubscribed!A:A",
    });
    const unsubscribedEmails = new Set(
      unsubscribedData.data.values? unsubscribedData.data.values.flat() : []);

    // 4.3. Read the recipient list (Recipients sheet)
    const headerData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Recipients!1:1", // <-- EFFICIENCY FIX: Only get the first row
    });

    // --- THIS IS THE KEY FIX ---
    const headers = headerData.data.values; // Select the first row
    // ---
    
    console.log("headers :", headers[0]); // This will now log:

    const idIndex = headers[0].indexOf("ID");
    const emailIndex = headers[0].indexOf("Email");
    const firstNameIndex = headers[0].indexOf("FirstName");

    console.log("idIndex :", idIndex); // Will be 0
    console.log("emailIndex :", emailIndex); // Will be 1
    console.log("firstNameIndex :", firstNameIndex); // Will be 2

    if (idIndex === -1 || emailIndex === -1 || firstNameIndex === -1) {
      return res.status(500).send(
        "Error: Missing required columns (ID, Email, FirstName) in Recipients sheet."
      );
    }

    // This call is now correct, as it gets ONLY the data rows
    const recipientsData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Recipients!A2:Z",
    });

    if (!recipientsData.data.values) {
      return res.status(404).send("No recipients found.");
    }

    // 4.4. Filter recipients against the suppression list
    const netRecipients = recipientsData.data.values
   .map((row) => ({
        id: row[idIndex],
        email: row[emailIndex],
        firstName: row[firstNameIndex],
      }))
   .filter((user) => user.email &&!unsubscribedEmails.has(user.email));

    // 4.5. Respond to Postman IMMEDIATELY
    res.status(202).json({
      status: "Job Accepted",
      message: `Email batch job started. Processing ${netRecipients.length} recipients in the background.`,
      totalFound: recipientsData.data.values? recipientsData.data.values.length : 0,
      suppressed: unsubscribedEmails.size,
      netRecipients: netRecipients.length,
    });

    // 4.6. Start the background job *WITHOUT* await
    runEmailBatch(netRecipients);

  } catch (error) {
    console.error("Error in /send-emails setup:", error);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error while starting job.");
    }
  }
};


const emailUnsubscriber = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).send('<html><body><h1>Error: Missing email parameter.</h1></body></html>');
    }

    // 1️⃣ Check if already unsubscribed
    const checkData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Unsubscribed!A:A',
    });
    const existing = new Set(checkData.data.values ? checkData.data.values.flat() : []);

    // 2️⃣ If not already unsubscribed, append
    if (!existing.has(email)) {
      const timestamp = new Date().toISOString();
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Unsubscribed!A:B',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[email, timestamp]],
        },
      });
    }

    // 3️⃣ Send self-closing confirmation page
    res.set("Content-Type", "text/html");
    res.send(`
      <html>
        <head>
          <title>Unsubscribed</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              margin-top: 80px; 
            }
            h2 { color: #f44336; }
          </style>
        </head>
        <body>
          <h2>You’ve been unsubscribed successfully!</h2>
          <p><strong>${email}</strong> will no longer receive emails.</p>
          <script>
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    console.error("Error in /unsubscribe:", error);
    res.status(500).send(`
      <html>
        <body style="font-family:Arial;text-align:center;padding-top:50px;">
          <h2 style="color:red;">Unsubscribe failed. Please try again later.</h2>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
  }
};


export {
    emailSender,
    emailUnsubscriber
}