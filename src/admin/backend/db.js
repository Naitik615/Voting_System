const { MongoClient } = require("mongodb");
let dbConnection;
let uri = 'mongodb+srv://chessashishrautela:Ip9efAjfFziy4WYV@cluster0.3g8fqtt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

module.exports = {
  connectToDb: (cb) => {
    MongoClient.connect(uri)
      .then((client) => {
        dbConnection = client.db('VOTING');
        return cb();
      })
      .catch(err => {
        console.log(err);
        return cb(err);
      });
  },
  getDb: () => dbConnection
};