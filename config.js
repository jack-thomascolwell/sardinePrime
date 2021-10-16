module.exports = {
  server: {
    port: 4000,
  },
  mongodb: {
    url: `mongodb+srv://jack-thomascolwell:${process.env.DBPASS}@cluster0.vk82t.mongodb.net/sardineDemoDB?retryWrites=true&w=majority`
  },
  auth: {
    cookieName: process.env.COOKIENAME || 'sardineAuth',
    cookiePass: process.env.COOKIEPASS || '!wsYhFA*C2U6nz=Bu^%A@^F#SF3&kSR6'
  }
};
