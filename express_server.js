const express = require("express");
const methodOverride = require('method-override');
const cookieSession = require('cookie-session');
const app = express();
const bcrypt = require('bcrypt');
const bodyParser = require("body-parser");
const { getUserByEmail, generateRandomString, urlsForUser} = require("./helpers");
const PORT = 8080;

app.use(methodOverride('_method'));

app.set("view engine", "ejs");

app.use(cookieSession({
  name: 'session',
  keys: [`some-secret-key`]
}));

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
};

const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "userRandomID", views: [], uniques: {} },
  i3BoGr: { longURL: "https://www.google.ca", userID: "user2RandomID", views: [], uniques: {} }
};

//assigns unique id to every visitor
app.use("/", (req, res, next) => {
  if (!req.session.visitor_id) {
    req.session.visitor_id = generateRandomString();
  }
  next();
});

//takes user to urls or login if logged out
app.get("/", (req, res) => {
  if (req.session.user_id) {
    res.redirect('/urls');
  } else {
    res.redirect('/login');
  }
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  const templateVars = { user: users[req.session.user_id], urls: urlsForUser(req.session.user_id, urlDatabase) };
  res.render("urls_index", templateVars);
});

//add url to data base
app.post("/urls", (req, res) => {
  const id = generateRandomString();
  urlDatabase[id] = {
    longURL: req.body.longURL,
    userID: req.session.user_id,
    views: [],
    uniques: {}
  };
  res.redirect(`/urls/${id}`);
});

//login page, redirects to urls if logged in
app.get("/login", (req, res) => {
  if (req.session.user_id) {
    res.redirect('/urls');
  } else {
    const templateVars = { user: users[req.session.user_id] };
    res.render("login", templateVars);
  }
});

//verifies login then stores cookie with user id
app.post("/login", (req, res) => {
  const id = getUserByEmail(req.body.email, users);
  if (!id) {
    res.status(403).send("Email not registered");
  } else if (!bcrypt.compareSync(req.body.password, users[id].password)) {
    res.status(403).send("Incorrect password");
  } else {
    req.session.user_id = id;
    res.redirect('/urls');
  }
});

//clears userid cookie
app.post("/logout", (req, res) => {
  req.session.user_id = null;
  res.redirect('/urls');
});

//registration page
app.get("/register", (req, res) => {
  if (req.session.user_id) {
    res.redirect('/urls');
  } else {
    const templateVars = { user: users[req.session.user_id] };
    res.render("register", templateVars);
  }
});

//verifies info is valid then creates a new user
app.post("/register", (req, res) => {
  if (req.body.email === "" || req.body.password === "") {
    res.status(400).send("Invalid email or password");
  } else if (getUserByEmail(req.body.email, users)) {
    res.status(400).send("Email already registered");
  } else {
    const id = generateRandomString();
    users[id] = {
      id,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 10)
    };
    req.session.user_id = id;
    res.redirect('/urls');
  }
});

//page to create new url
app.get("/urls/new", (req, res) => {
  if (!req.session.user_id) {
    res.redirect("/login");
  } else {
    const templateVars = { user: users[req.session.user_id] };
    res.render("urls_new", templateVars);
  }
});

//updates url if user owns it
app.put("/urls/:shortURL", (req, res) => {
  if (req.session.user_id !== urlDatabase[req.params.shortURL].userID) {
    res.status(401).send("Only the owner can edit the link");
  } else {
    urlDatabase[req.params.shortURL].longURL = req.body.longURL;
    res.redirect(`/urls/${req.params.shortURL}`);
  }
});

//deletes url if user owns it
app.delete("/urls/:shortURL", (req, res) => {
  if (req.session.user_id !== urlDatabase[req.params.shortURL].userID) {
    res.status(401).send("Only the owner can delete the link");
  } else {
    delete urlDatabase[req.params.shortURL];
    res.redirect("/urls");
  }
});

//shows url, if owned can edit here
app.get("/urls/:shortURL", (req, res) => {
  urlDatabase[req.params.shortURL].views.push([new Date(Date.now()).toDateString(), req.session.visitor_id]);
  urlDatabase[req.params.shortURL].uniques[req.session.visitor_id] = 1;
  const templateVars = {
    user: users[req.session.user_id],
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL,
    owner: urlDatabase[req.params.shortURL].userID,
    views: urlDatabase[req.params.shortURL].views,
    uniques: urlDatabase[req.params.shortURL].uniques
  };
  res.render("urls_show", templateVars);
});

//redirects to long url
app.get("/u/:shortURL", (req, res) => {
  res.redirect(urlDatabase[req.params.shortURL].longURL);
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}!`);
});
