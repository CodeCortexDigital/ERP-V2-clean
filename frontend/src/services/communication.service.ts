import api from "./api";

const communicationService = {
  sendWhatsAppTest: (phone: string, message: string) =>
    api.post("/communication/whatsapp/test-send/", {
      recipient_phone: phone,
      message
    }),
};

export default communicationService;
