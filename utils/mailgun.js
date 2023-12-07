const mailgun = require("mailgun-js");
require("dotenv").config();

const apiKey = process.env.MAILGUN_KEY;
const domain = "3speak.tv";

const mg = mailgun({ apiKey, domain });


const sendEmail = (creator, newUser, email) => {
  
  const emailData = {
      from: "breakaway.communities@3speak.tv",
      to: email,
      subject: "Account created",
      text: `Congratulations🎉, your friend @${creator} has creadted your hive account (@${newUser}) successfully`,
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