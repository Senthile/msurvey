//javascript fallbacks
if (typeof String.prototype.trim !== 'function') {
    String.prototype.trim = function () {
        return this.replace(/^\s+|\s+$/g, '');
    };
}

var Service = (function () {

    var ajaxPost = function (data, returnType, sync) {
        var defer = $.Deferred();
        $.ajax({
            type: "POST",
            url: "/" + data.operation,
            data: JSON.stringify(data),
            contentType: "application/json",
            dataType: returnType ? returnType : "json",
            async : sync ? !sync : true,
            success: function (response) {
                defer.resolve(response);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                var error = {};
                error.jqXHR = jqXHR;
                error.textStatus = textStatus;
                error.errorThrown = errorThrown;
                defer.reject(error);
            }
        });
        return defer.promise();
    };

    return {
        ajaxPost: ajaxPost
    };

} ());


$(document).ready(function () {
    var doc = window.document, index = 0, totalSeconds, suspended,
        colorCode =  { "A": "#006dcc", "B": "#49afcd", "C": "#5bb75b", "D" : "#faa732", "E" : "#da4f49" },    
        $errorModal = $(doc.getElementById('errorModal')),
        $previous = $(doc.getElementById('previous')),
        $next = $(doc.getElementById('next')),
        $start = $(doc.getElementById('start')),
        $reset = $(doc.getElementById('reset')),
        $qid = $(doc.getElementById('qid')),
        $questionContainer = $(doc.getElementById('questionContainer')),        
        $timer = $(doc.getElementById('timer')),
        $receivedResps = $(doc.getElementById('receivedResps')),
        $resultContainer = $(doc.getElementById('resultContainer')),
        $pieGraph = $(document.getElementById("pieGraphContainer")),
        $columnGraph = $(document.getElementById("columnGraphContainer")),        
        $spinner = $(doc.getElementById('spinner'));


    var showError = function (message) {
        $errorModal.find("#error").text(message);
        $errorModal.modal('show');
    };

    var setNavigation = function (index) {
        var count = Questions.length - 1;

        $previous.hide();
        $next.hide();

        if (index < count) {
            $next.show();
        }

        if (index !== 0) {
            $previous.show();
        }
    };
    
    var getQuestionVoteOption = function (val) {
        return val.substring(val.indexOf("[") + 1, (val.indexOf("]")));
    }; 
    
    var getQuestionId = function() {
        var qid = $qid.text();
        return qid.replace("QID: ","");
    };
    
    var displayResponseCount = function(val) {
        $receivedResps.text("Responses: " + val.toString());    
    };
    
    var drawGraph = function(index) {
        var question = Questions[index], data = [["Question", "", { role: 'style' }]], option, voteResult = {}, val, pollCount = 0;
        
         var requestData = { operation : "getSurveyResults" };
         requestData.id = getQuestionId();        

        $spinner.show();
         Service.ajaxPost(requestData, "text").then(function(results){
            if(!results) return;
            
            $resultContainer.show();
            results = $.parseJSON(results);
            for (var ip in results.vote) {
                if (results.vote.hasOwnProperty(ip)) {
                    if (!voteResult[results.vote[ip]]) {
                        voteResult[results.vote[ip]] = 0;
                    }
                    voteResult[results.vote[ip]] += 1;
                    pollCount += 1;
                }
            }
            
            displayResponseCount(pollCount);
            for(var i=0, len=question.options.length; i < len; i++) {
                option = question.options[i];
                val = voteResult[getQuestionVoteOption(option.val)] || 0;            
                data.push([option.val, val, option.color]);
            }
    
            var view = new google.visualization.DataView(google.visualization.arrayToDataTable(data));
            view.setColumns([0, 1,
                {
                    calc: "stringify",
                    sourceColumn: 1,
                    type: "string",
                    role: "annotation"
                },
                2]);
    
            var options = {
                title: '',
                backgroundColor: '#E0E0E0',
                bar: { groupWidth: "95%" },
                legend: { position: "none" }
            };
    
            var chart = new google.visualization.ColumnChart($columnGraph[0]);
            chart.draw(view, options);
            
    
            //pie Chart
            var options = {
                title: 'What is your favourite color?',
                is3D: true,
                backgroundColor: '#E0E0E0',
                colors: ["#006dcc", "#49afcd", "#5bb75b", "#faa732","#da4f49"],
                chartArea: { width: "75%", height: "75%", top: 1, left: 50 },
                legend: { alignment: 'center', position: 'right', textStyle: { fontSize: 15 }, maxLines: 10 },
                tooltip: { textStyle: { fontSize: 14 } }
            };
    
            chart = new google.visualization.PieChart($pieGraph[0]);
            chart.draw(google.visualization.arrayToDataTable(data), options);
         }, function(error) {
            showError("Graph data not received. Please try again.");
         }).always(function() {
             $spinner.hide();
         });        
    };    

    var showQuestion = function (index) {
        var question = Questions[index], output = "", option,
            template = '{{#question}} <p class="questionFont"> {{title}} </p> {{#options}} <p class="bigFont" style="color:{{color}}"> {{val}} </p>  {{/options}} {{/question}}';

        for (var i = 0, len = question.options.length; i < len; i++) {
            if (!question.options[i].color) {
                option = getQuestionVoteOption(question.options[i]); 
                question.options[i] = { color: colorCode[option], val: question.options[i] };
            }
        }

        output = Mustache.render(template, { question: question });
        $qid.text("QID: " + question.id);

        $questionContainer.empty();
        $questionContainer.html(output);

        setNavigation(index);
        drawGraph(index); 
    };
    
    var saveSurvery = function() {
        var data = { operation : "saveSurvey" };
        Service.ajaxPost(data, "text").then(function(response){
        }, function(error) {
        }).always(function() {
        });        
    };
    
    var openSurvey = function () {
         var data = { operation : "openSurvey" };
         data.id = getQuestionId();
         
         $spinner.show();
         Service.ajaxPost(data, "text").then(function(response){
            //after question survey opened
            tick(updateTimer);
            $resultContainer.show();
            $start.hide();
            displayResponseCount(0);
         }, function(error) {
            showError("Survey not opened. Please try again.");
         }).always(function() {
            $spinner.hide();
         });
    };  
    
    var closeSurvey = function (forceClose) {
        suspended = true;
        var data = { operation : "closeSurvey" };

        $spinner.show();
        Service.ajaxPost(data, "text",forceClose).then(function(response){
            //after question survey closed
            $start.show();
            if(!forceClose) {
                drawGraph(index);  
                saveSurvery();
            }
        }, function(error) {
            showError("Survey not closed. Please try again.");
        }).always(function() {
            $spinner.hide();
        });        
    };
    
    var resetSurvey = function () {
        var data = { operation : "resetSurvey" };
        Service.ajaxPost(data, "text",true).then(function(response){
        }, function(error) {
        }).always(function() {
        });        
    };    
    
    var updateResponseCount = function () {
        var data = { operation : "getResponseCount" };
    
        Service.ajaxPost(data, "text").then(function(response){
            var old = parseInt($receivedResps.text().replace("Responses:","")|| 0),
                curr = parseInt(response);
            if(old < curr) {
                displayResponseCount(curr);
            }    
        }, function(error) {
            
        }).always(function() {
        });  
    };

    var leadingZero = function (time) {
        return (time < 10) ? "0" + time : +time;
    };

    var updateTimer = function (seconds) {
        var minutes = Math.floor(seconds / 60);
        seconds -= minutes * (60);

        var timeStr = leadingZero(minutes) + ":" + leadingZero(seconds);
        $timer.text(timeStr);
    };

    var tick = function () {
        if(suspended) return;
        
        if (totalSeconds <= 0) {
            closeSurvey();
            return;
        }

        totalSeconds -= 1;
        if (totalSeconds % 5 === 0) updateResponseCount();
        updateTimer(totalSeconds);
        window.setTimeout(tick, 1000);           
    };

    var canMoveOff = function () {
        return suspended;
    };
    
    var start = function () {
        suspended = false;
        totalSeconds = SurveyTotalSeconds;
        $spinner.hide();
        $resultContainer.hide();  
        openSurvey();
    };

    var reset = function () {
        suspended = true;
        $start.show();
        $spinner.hide();
        $resultContainer.hide();
        $pieGraph.empty();
        $columnGraph.empty();
        closeSurvey(true);
        updateTimer(0);
        resetSurvey();
    };

    var load = function () {
        reset();
        showQuestion(index);
    };
    
    $previous.click(function () {
        if (canMoveOff()) {
            reset();
            showQuestion(--index);
        }
    });

    $next.click(function () {
        if (canMoveOff()) {
            reset();
            showQuestion(++index);
        }
    });

    $start.click(function () {
        reset();
        start();
    });

    $reset.click(function () {
        reset();
    });


    load();
});