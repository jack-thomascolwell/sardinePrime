module.exports = {
  server: {
    port: parseInt(process.env.PORT) || 4000,
  },
  mongodb: {
    url: `mongodb+srv://jack-thomascolwell:${process.env.DBPASS}@cluster0.vk82t.mongodb.net/sardineDemoDB?retryWrites=true&w=majority`
  },
  gcloud: {
    jsonAuth: process.env.GOOGLE_CLOUD_JSON,
    jsonPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    bucket: process.env.GCLOUD_STORAGE_BUCKET
  },
  auth: {
    cookieName: process.env.COOKIENAME || 'sardineAuth',
    cookiePass: process.env.COOKIEPASS || '!wsYhFA*C2U6nz=Bu^%A@^F#SF3&kSR6'
  },
};
