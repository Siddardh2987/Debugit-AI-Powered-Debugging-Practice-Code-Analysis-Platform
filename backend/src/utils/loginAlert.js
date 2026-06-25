// 🟢 Use .replaceAll('{{name}}', name) instead of replace ;
//          bcuz replace only changes the 1st occurrence of the variable not all the occurences.

import transporter from '../config/nodemailer.js';
import {
    LOGIN_SUCCESS_TEMPLATE,
    TOO_MANY_LOGIN_ATTEMPTS_TEMPLATE,
    TOO_MANY_PASSWORD_ATTEMPTS_TEMPLATE
} from '../config/emailTemplates.js';

const now = () => new Date().toLocaleString();

export const sendLoginSuccessEmail = async ({ email, name, ip }) => {
    await transporter.sendMail({
        from: process.env.SENDER_EMAIL,
        to: email,
        subject: '✅ Login Successful',
        html: LOGIN_SUCCESS_TEMPLATE
            .replaceAll('{{name}}', name)
            .replaceAll('{{ip}}', ip)
            .replaceAll('{{time}}', now())
    });
};

export const sendTooManyLoginAttemptsEmail = async ({ email, name, ip }) => {
    await transporter.sendMail({
        from: process.env.SENDER_EMAIL,
        to: email,
        subject: '🚨 Too Many Login Attempts',
        html: TOO_MANY_LOGIN_ATTEMPTS_TEMPLATE
            .replaceAll('{{name}}', name)
            .replaceAll('{{ip}}', ip)
            .replaceAll('{{time}}', now())
    });
};

export const sendTooManyPasswordAttemptsEmail = async ({ email, name, ip }) => {
    await transporter.sendMail({
        from: process.env.SENDER_EMAIL,
        to: email,
        subject: '🚨 Password Attempts Blocked',
        html: TOO_MANY_PASSWORD_ATTEMPTS_TEMPLATE
            .replaceAll('{{name}}', name)
            .replaceAll('{{ip}}', ip)
            .replaceAll('{{time}}', now())
    });
};