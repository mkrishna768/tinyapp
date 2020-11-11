const express = require("express");
const cookieParser = require('cookie-parser')
const app = express();
const bcrypt = require('bcrypt');
app.use(cookieParser());
const PORT = 8080; // default port 8080

function generateRandomString() {
  let string = "";
  const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
  for (let i = 0; i < 6; i++) {
    string += characters[Math.floor(Math.random() * characters.length)];
  }
  return string;
};

//checks if email is registered to a user and if so returns user id, if not returns undefined
function emailLookUp(email) {
  for (let user in users) { 
    if (users[user].email === email) {
      return users[user].id;
    }
  }
}

function urlsForUser(id) {
  let userUrls = {}
  for (let url in urlDatabase) {
    if (urlDatabase[url].userID === id) {
      userUrls[url] = urlDatabase[url];
    }
  }
  return userUrls;
}

app.set("view engine", "ejs");
const bodyParser = require("body-parser");


app.use(bodyParser.urlencoded({extended: true}));

const users = { 
  "userRandomID": {
    id: "userRandomID", 
    email: "user@example.com", 
    password: bcrypt.hashSync("purple-monkey-dinosaur", 10)
  },
 "user2RandomID": {
    id: "user2RandomID", 
    email: "user2@example.com", 
    password: bcrypt.hashSync("dishwasher-funk", 10)
  }
}

const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "userRandomID" },
  i3BoGr: { longURL: "https://www.google.ca", userID: "user2RandomID" }
};


app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]], urls: urlsForUser(req.cookies["user_id"]) };
  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  const id = generateRandomString();
  urlDatabase[id] = {
    longURL: req.body.longURL,
    userID: req.cookies["user_id"]
  };
  res.redirect(`/urls/${id}`);
});

app.get("/login", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]] };
  res.render("login", templateVars);
});

app.get("/register", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]] };
  res.render("register", templateVars);
});

app.post("/register", (req, res) => {
  if (req.body.email === "" || req.body.password === "") {
    res.status(400).send("Invalid email or password");
  } else if (emailLookUp(req.body.email)) {
    res.status(400).send("Email already registered");
  } else {
    const id = generateRandomString();
    users[id] = {
      id,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 10)
    };
    res.cookie('user_id', id);
    res.redirect('/urls');
  }
});

app.post("/login", (req, res) => {
  const id = emailLookUp(req.body.email);
  if (!id) {
    res.status(403).send("Email not registered");
  } else if (!bcrypt.compareSync(req.body.password, users[id].password)) {
    res.status(403).send("Incorrect password");
  } else {
    res.cookie('user_id', id);
    res.redirect('/urls');
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie('user_id');
  res.redirect('/urls');
});

app.get("/urls/new", (req, res) => {
  if (!req.cookies["user_id"]) {
    res.redirect("/login");
  } else {
    const templateVars = { user: users[req.cookies["user_id"]] };
    res.render("urls_new", templateVars);
  }
});

app.post("/urls/:shortURL", (req, res) => {
  if (req.cookies["user_id"] !== urlDatabase[req.params.shortURL].userID) {
    res.status(401).send("Only the owner can edit the link");
  } else {
    urlDatabase[req.params.shortURL].longURL = req.body.longURL;
    res.redirect(`/urls/${req.params.shortURL}`);
  }
});

app.post("/urls/:shortURL/delete", (req, res) => {
  if (req.cookies["user_id"] !== urlDatabase[req.params.shortURL].userID) {
    res.status(401).send("Only the owner can delete the link");
  } else {
    delete urlDatabase[req.params.shortURL];
    res.redirect("/urls");
  }
});

app.get("/urls/:shortURL", (req, res) => {
  const templateVars = { user: users[req.cookies["user_id"]], shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL].longURL, owner: urlDatabase[req.params.shortURL].userID };
  res.render("urls_show", templateVars);
});



app.get("/u/:shortURL", (req, res) => {
  res.redirect(urlDatabase[req.params.shortURL].longURL);
});
app.get("/hello", (req, res) => {
  res.send(`<html><body>Hello <b>World</b></body></html>\n`);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
