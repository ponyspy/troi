var fs = require('fs');
var express = require('express');
    var app = express();

var mongoose = require('mongoose');
  var Schema = mongoose.Schema;

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.locals.pretty = true;
// app.use(express.favicon(__dirname + '/public/img/favicon.ico'));
app.use(express.bodyParser({ keepExtensions: true, uploadDir:__dirname + '/uploads' }));
app.use(express.cookieParser());
app.use(express.session({ secret: 'keyboard cat' }));
app.use(express.static(__dirname + '/public'));

app.configure(function(){
  //...
  app.use(function(req, res, next){
    res.locals.session = req.session;
    next();
  });
  //...
});

mongoose.connect('localhost', 'test');

var itemSchema = new Schema({
  title: String,
  description: String,
  date: {type: Date, default: Date.now},
  img: String
});

var UserSchema = new Schema({
  name: String,
  pass: String,
  date: {type: Date, default: Date.now},
  items: [itemSchema]
});


var User = mongoose.model('User', UserSchema);
// var Item = mongoose.model('Item', itemSchema);
/*
var user = new User();
user.name = 'foo';
user.pass = 'bar';
user.items.push({title:'Macbook', description:'Apple Computer', img:'img1.jpg'});

user.save(function(err) {
  if (err) { throw err;}
  console.log('User created');
  //mongoose.disconnect();
});
*/
// 1 рассинхрон загрузки файла с очередью БД



function checkAuth(req, res, next) {
  if (!req.session.user_id) {
    res.send('You are not authorized to view this page');
  } else {
    next();
  }
}

app.get('/', function(req, res){
    res.render('index');
});

app.get('/login', function(req, res){
  if (req.session.user_id == '4786242642') {
    res.redirect('/');
  }
  else {
    res.render('login', {status: true});
  }
});

app.post('/login', function (req, res) {
  var post = req.body;

  User.findOne({ 'name': post.user, 'pass': post.password }, function (err, person) {
    if (err) return handleError(err);
    if (person) {
      req.session.user_id = '4786242642'; 
      req.session.user = post.user;
      req.session.pass = post.password;
      res.redirect('/');
    } else {
      res.render('login', {status: false});
    }
  });
});

app.get('/registr', function(req, res) {
  res.render('registr');
});

app.post('/registr', function (req, res) {
  var post = req.body;
  var user = new User();

  user.name = post.user;
  user.pass = post.password;

  user.save(function(err) {
    if(err) {
      throw err;
    }
    console.log('New User created');
    res.redirect('/login');
  });
});

app.get('/auth', checkAuth, function(req, res) {
  res.render('auth');
});

app.get('/auth/add', checkAuth, function(req, res) {
  res.render('add');
});

app.post('/auth/add', function(req, res) {
  var post = req.body;
  var user = req.session.user;
  var pass = req.session.pass;
  var path;

  fs.readdir(__dirname + '/public/img/', function(err, files) {
    var imgName = files.length || 0;

    if (req.files.img1.type == 'image/jpeg') {
      path ='/img/' + imgName + '.jpg';
      fs.rename(req.files.img1.path, __dirname + '/public' + path);

    User.findOne({'name': user, 'pass': pass}, function(err, user) {
      user.items.push({
        title: post.title,
        description: post.description,
        img: path
      });

      user.save(function(err) {
        if(err) {
          throw err;
        }
        console.log('New item created');
        res.redirect('/auth/view');
      });
    });
    
    } else {
      fs.unlink(req.files.img1.path);
    }
  });
// *1*
});

app.get('/auth/edit/:item', checkAuth, function(req, res) {
  var itemID = req.params.item;
  var user = req.session.user;
  var pass = req.session.pass;

  User.findOne({'name': user, 'pass': pass}, function(err, user) {
    var doc = user.items.id(itemID);
    if (doc) {
      res.render('edit', {item: doc});
    } else {
      res.redirect('/auth/view');
    }
  });
});

app.post('/auth/edit/:item', function(req, res) {
  var post = req.body;
  var itemID = req.params.item;
  var user = req.session.user;
  var pass = req.session.pass;

  User.findOne({'name': user, 'pass': pass}, function(err, user) {
    var title = user.items.id(itemID).title = post.title;
    var description = user.items.id(itemID).description = post.description;
    user.save();
    res.redirect('/auth/view');
  });
});

app.get('/auth/view', checkAuth, function(req, res) {
  var user = req.session.user;
  var pass = req.session.pass;

  User.findOne({'name': user, 'pass': pass}, function(err, user) {
    res.render('view', {items:user.items});
  });
});

app.get('/auth/view/:item', checkAuth, function(req, res) {
  var user = req.session.user;
  var pass = req.session.pass;

  User.findOne({'name': user, 'pass': pass}, function(err, user) {
    doc = user.items.id(req.params.item);
    res.render('item', {item:doc});
  });
});

app.post('/auth/view/:item', function(req, res) {
  var post = req.body;
  var user = req.session.user;
  var pass = req.session.pass;

  if (post.delete) {
    User.findOne({'name': user, 'pass': pass}, function(err, user) {
      fs.unlink(__dirname + '/public' + user.items.id(post.delete).img);
      doc = user.items.id(post.delete).remove();
      user.save();
      res.redirect('/auth/view');
    });
  }
  else if (post.edit) {
    res.redirect('/auth/edit/' + post.edit);
  }
});

app.get('/logout', function (req, res) {
  delete req.session.user_id;
  delete req.session.user;
  delete req.session.pass;
  res.redirect('/');
});

app.get('/about', function (req, res) {
  res.render('about');
});

app.get('/links', function (req, res) {
  res.render('links');
});

app.get('/history', function (req, res) {
  res.render('history');
});

app.listen(3000);
console.log('http://127.0.0.1:3000')