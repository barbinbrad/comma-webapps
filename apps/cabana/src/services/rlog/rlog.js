import request from 'simple-get';

const rlog = {
  getLogPart(logUrl) {
    return new Promise(async (resolve, reject) => {
      request(logUrl, (err, res) => {
        if (err) {
          return reject(err);
        }
        resolve(res);
      });
    });
  },
};

export default rlog;
