const mailgun = require("mailgun-js");
require("dotenv").config();

const apiKey = process.env.MAILGUN_KEY;
const domain = "3speak.tv";

const mg = mailgun({ apiKey, domain });


const sendEmail = (newUser, creator, email) => {
   
  const emailData = {
    from: "breakaway.communities@3speak.tv",
    to: email,
    subject: "Account created",
    html: `
      <p>Congratulations 🎉, your friend <strong>@${creator}</strong> has created your Hive account <strong>@${newUser}</strong> successfully!</p>
      <p>Hive is a decentralized platform where you can share your passions, engage with communities, and earn cryptocurrency rewards for your contributions.</p>
      
      <!-- Hive Keychain Instructions -->
      <div style="margin-top: 20px;">
        <h3>Make sure you have Hive Keychain installed on your device</h3>
        
        <!-- Instructions for Computer Users -->
        <p><strong>For Computer Users:</strong></p>
        <ol>
          <li>Install Hive Keychain extension on: <a href="https://hive-keychain.com" target="_blank">hive-keychain.com</a></li>
          <li>Pin keychain to your browser</li>
          <li>Log in to Hive Keychain using your Hive username and <strong>master password</strong>.</li>
        </ol>
        
        <!-- Instructions for Mobile Users -->
        <p><strong>For Mobile Users:</strong></p>
        <ol>
          <li>Download and install Hive Keychain from your app store.</li>
          <li>Open Hive Keychain and log in using your Hive username and <strong>master password</strong>.</li>
          <li>Authorize Hive Keychain to interact with your Hive account.</li>
        </ol>
        
        <p>Learn more about breakaway communities <a href="https://breakaway.community" target="_blank">Here!</a>!</p>
        <p>Happy Hiving! 🚀</p>
      </div>
    `,
  };
  
  

    return new Promise((resolve, reject) => {
      // Send email
      mg.messages().send(emailData, (error, body) => {
        if (error) {
          console.error("Error sending email:", error);
          reject(error);
        } else {
          console.log("Email sent successfully:", body);
          resolve(body);
        }
      });
    });
  }

  module.exports = { sendEmail }