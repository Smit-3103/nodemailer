import dotenv from 'dotenv'
import {auth} from './config/googleClient.js'
import {app} from './app.js'

dotenv.config({
    path:"./.env"
})

if(auth){
    console.log("auth :",auth);
    
    app.on("error", (error)=>{
        console.log("google sheet error :",error)
    })

    app.listen(process.env.PORT || 4000, ()=>{
        console.log(`server is running at: ${process.env.PORT || 4000}`)
    })
}
else{
    console.log("Google sheet connection failed")
}