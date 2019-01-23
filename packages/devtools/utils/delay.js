module.exports = {
  delay: function (ms = 200) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }
}