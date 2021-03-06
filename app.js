var express = require("express"),
    engines = require('consolidate'),
    fs = require('fs'),
    config = require('./config.json'),
    jf = require('jsonfile');
    
var app = express();

global.Survey = {};
global.Barometer = {};

app.configure(function() {
    app.set('title', 'CTS-Polling');
    
    app.set('views', __dirname + '/views');
    app.use(express.static( __dirname + '/public'));
    app.use('/public', express.static(__dirname + '/public'));
    
    app.use(express.bodyParser());
    app.use(express.cookieParser('S3CRE7'))
    app.use(express.session());
    
    app.use(express.responseTime());
    app.use(app.router); //Explicitly add the router to errorHandler to work
    app.use(express.errorHandler());
    
    /*app.use(express.logger(
        {
            format: 'default',
            stream: fs.createWriteStream('app.log', {'flags': 'a'}) 
        }
    ));*/

    app.engine('html', engines.handlebars);
    app.set('view engine', 'html');
    
});


app.get('/',function(req, res){
    res.render("login");
});

app.get('/vote',function(req, res){
    res.redirect('/public/vote.html');
});

app.post('/',function(req, res){
    var user = req.body.username,
        password = req.body.password;

   if(user==="admin" && password==="test") {
        var context = {};
        context.user = req.session.user;
        context.duration = config.duration;
        res.render('index', context);
        resetSurvey();
    } else {
        res.render("login");
    }
});

app.get('/logout', function (req, res) {
    req.session.destroy(function () {
        res.redirect('/');
    });
});

app.post('/castVote', function(req, res) { 
    var obj = req.body;
    var option = obj.option,
        //clientIP = obj.clientIP,
        clientIP = req.sessionID;
        message = "";
    
    if(option === 'T') {
        message = "Test connection succeeded. You look good for voting!!";
    } else {
        if(Survey.QID) {
            castVote(Survey.QID, option, clientIP)
            message = "Your vote casted successfully. Thank you!!";
        }
    }
    res.send(message); 
});

app.post('/openSurvey', function(req, res) { 
    var obj = req.body;    
    Survey.QID = obj.id;
    Survey.Result.PollCount = 0;
    removeQuestion(Survey.QID);
    res.send("success"); 
});

app.post('/closeSurvey', function(req, res) { 
    Survey.QID = null;
    res.send("success"); 
});

app.post('/saveSurvey', function(req, res) { 
    jf.writeFile('result.json', Survey.Result, function(err) {
        if(err) {
          res.send("error"); 
        } else {
          res.send("success"); 
        }
    });    
});

app.post('/resetSurvey', function(req, res) { 
    resetSurvey();
    res.send("success"); 
});

app.post('/getResponseCount', function(req, res) { 
    res.send(Survey.Result.PollCount.toString()); 
});

app.post('/getSurveyResults', function(req, res) { 
    var obj = req.body;    
    var question = getQuestion(obj.id);
    res.send(JSON.stringify(question)); 
    //res.setHeader('Content-Type', 'application/json');
    //res.end(JSON.stringify(question));
});


app.get('/startBarometer', function(req, res) { 
    Barometer.isActive = true;
    resetBarometer();
    res.send("success"); 
});

app.get('/closeBarometer', function(req, res) { 
    Barometer.isActive = false;
    resetBarometer();
    res.send("success"); 
});

app.post('/updateBoaringLevel', function(req, res) { 
    if(Barometer.isActive) {
        var obj = req.body,    
        clientId = req.sessionID,
        boaringLevel = obj.boaringLevel;
        
        updateBoaringLevel(clientId,boaringLevel);
        res.send("success"); 
    } else {
        res.send("fail"); 
    }
});

app.get('/getBoaringLevel', function(req, res) { 
    var percent = 0;
    if(Barometer.isActive) {
        percent = getBoaringLevel();
    }
    res.send(percent.toString()); 
});

var getQuestion = function(questionId) {
    var question;
    for(var i=0, len = Survey.Result.length; i<len; i++) {
        question = Survey.Result[i];
        if(question.id === questionId) {
            return question;
        }
    } 
};

var removeQuestion = function (questionId) {
    var question;
    
    for (var i = Survey.Result.length - 1; i > -1 ; i--) {
        question = Survey.Result[i];
        if (question.id === questionId) {
            Survey.Result.splice(i, 1);
            return;
        }
    }
};

var castVote = function(questionId, option, clientIP) {
    var question = getQuestion(questionId);

    if (!question) {
        question = {};
        question.id = questionId;
        question.vote = {};

        Survey.Result.push(question);
        question = Survey.Result[Survey.Result.length - 1];
    }

    if (!question.vote[clientIP]) {
        question.vote[clientIP] = {};
        Survey.Result.PollCount += 1;
    }
    question.vote[clientIP] = option;
};

var resetSurvey = function() {
    var contents = fs.readFileSync('result.json').toString();
    if(!contents) {
        Survey.Result = [];
    } else {
        Survey.Result = JSON.parse(contents);
        //Survey.Result = jf.readFileSync('result.json');
    }
    Survey.QID = null;
    Survey.Result.PollCount = 0;    
};

var resetBarometer = function() {
    Barometer.Result = [];
};

var getBoaringResult = function(clientId) {
    var result;
    for(var i=0, len = Barometer.Result.length; i<len; i++) {
        result = Barometer.Result[i];
        if(result.id === clientId) {
            return result;
        }
    } 
};

var updateBoaringLevel = function(clientId, val) {
    var result = getBoaringResult(clientId);
    if (!result) {
        result = {};
        result.id = clientId;
        result.boaringLevel = 0;

        Barometer.Result.push(result);
        result = Barometer.Result[Barometer.Result.length - 1];
    }
    result.boaringLevel = val > 100 ? 100 : val;
};

var getBoaringLevel = function() {
    var total = 0, result, percentResult;
    
    if(!Barometer.Result.length) { return 0; };
    
    for(var i=0, len = Barometer.Result.length; i<len; i++) {
        result = Barometer.Result[i];
        total += result.boaringLevel;
    }
    percentResult = total/Barometer.Result.length;
    return percentResult;
};

app.listen(process.env.PORT);