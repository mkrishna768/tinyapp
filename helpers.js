const getUserByEmail = function(email, users) {
  for (let user in users) { 
    if (users[user].email === email) {
      return users[user].id;
    }
  }
}

const generateRandomString = function() {
  let string = "";
  const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
  for (let i = 0; i < 6; i++) {
    string += characters[Math.floor(Math.random() * characters.length)];
  }
  return string;
};

module.exports = {getUserByEmail, generateRandomString}