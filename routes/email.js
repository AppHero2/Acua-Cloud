var express = require('express');

var router = express.Router();

router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
      user: process.env.GMAIL_ACCOUNT,
      pass: process.env.GMAIL_PASSWORD,
  },
});

router.post('/send', (req, res, next) => {

    const subject = req.body.subject;
    const text = req.body.text;
    const html = req.body.html;

    // setup email data with unicode symbols
    const mailOptions = {
        from: process.env.GMAIL_ACCOUNT, // sender address
        to: process.env.CONTACT_EMAIL, // list of receivers
        subject: subject, // Subject line
        text: text, // plain text body
        html: html // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            res.status(402).send(error);
        } else {
            res.status(200).send(info);
        }
        console.log('Message sent: %s', info.messageId);
    }); 

});

module.exports = router;

