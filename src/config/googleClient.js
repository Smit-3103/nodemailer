
import googleapis from 'googleapis'; // 1. Use default import for 'googleapis'
import dotenv from 'dotenv';

dotenv.config({
    path: "./.env"
});

// 2. Destructure 'google' from the default import
const { google } = googleapis;

// 3. Use "export const" to create named exports for ESM
export const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

export const sheets = google.sheets({ version: 'v4', auth });

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

console.log("SPREADSHEET_ID SPREADSHEET_ID:",SPREADSHEET_ID);
