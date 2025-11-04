import { Router } from "express";
import {emailSender,emailUnsubscriber} from '../controller/all.controller.js'

const router = Router()

router.route('/send-email').post(emailSender)
router.route('/unsubscribe').get(emailUnsubscriber)

export default router