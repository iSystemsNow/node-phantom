//Released to the public domain.

var port=phantom.args[0];
var webpage=require('webpage');
var controlpage=webpage.create();


function respond(response){
//	console.log('responding:'+response);
	controlpage.evaluate('function(){socket.emit("res",'+JSON.stringify(response)+');}');
}

var pages={};
var pageId=1;

function setupPushNotifications(id, page) {
	var callbacks=['onAlert','onConfirm','onConsoleMessage','onError','onInitialized','onLoadFinished',
	               'onLoadStarted','onPrompt','onResourceRequested','onResourceReceived','onResourceError',
	               'onUrlChanged','onCallback'];
	function push(notification){
		controlpage.evaluate('function(){socket.emit("push",'+JSON.stringify(notification)+');}');
	}
	callbacks.forEach(function(cb) {
		page[cb]=function(parm){
			var notification=Array.prototype.slice.call(arguments);
			if((cb==='onResourceRequested')&&(parm.url.indexOf('data:image')===0)) return;

			push([id, cb, notification]);
		};
	});
}

controlpage.onAlert=function(msg){
	var request=JSON.parse(msg);
	var cmdId=request[1];
//	console.log(request);
	if(request[0]===0){
		switch(request[2]){
		case 'createPage':
			var id=pageId++;
			var page=webpage.create();
			pages[id]=page;
			setupPushNotifications(id, page);
			respond([id,cmdId,'pageCreated']);
			break;
		case 'injectJs':
			var success=phantom.injectJs(request[3]);
			respond([0,cmdId,'jsInjected',success]);
			break;
		case 'addCookie':
			phantom.addCookie(request[3]);
			respond([0,cmdId,'cookieAdded',success]);
			break;
		case 'exit':
			respond([0,cmdId,'phantomExited']); //optimistically to get the response back before the line is cut
			break;
		case 'exitAck':
			phantom.exit();
			break;
		default:
			console.error('unrecognized request:'+request);
			break;
		}
	}
	else{
		var id=request[0];
		var page=pages[id];
		switch(request[2]){
		case 'pageOpen':
			page.open(request[3]);
			break;
		case 'pageOpenWithCallback':
			page.open(request[3], function(status){
				respond([id, cmdId, 'pageOpened', status]);
			});
			break;
		case 'pageClose':
			page.close();
			respond([id,cmdId,'pageClosed']);
			break;
		case 'pageInjectJs':
			var result=page.injectJs(request[3]);
			respond([id,cmdId,'pageJsInjected',JSON.stringify(result)]);
			break;
		case 'pageIncludeJs':
			var alreadyGotCallback=false;
			page.includeJs(request[3], function(){
				if(alreadyGotCallback)return;
				respond([id,cmdId,'pageJsIncluded']);
				alreadyGotCallback=true;
			});
			break;
		case 'pageSendEvent':
			page.sendEvent(request[3],request[4],request[5]);
			respond([id,cmdId,'pageEventSent']);
			break;
		case 'pageUploadFile':
			page.uploadFile(request[3],request[4]);
			respond([id,cmdId,'pageFileUploaded']);
			break;
		case 'pageEvaluate':
			var result=page.evaluate.apply(page,request.slice(3));
			respond([id,cmdId,'pageEvaluated',JSON.stringify(result)]);
			break;
        case 'pageEvaluateAsync':
			page.evaluateAsync.apply(page,request.slice(3));
			respond([id,cmdId,'pageEvaluatedAsync']);
			break;
		case 'pageRender':
			page.render(request[3]);
			respond([id,cmdId,'pageRendered']);
			break;
		case 'pageRenderBase64':
			var result=page.renderBase64(request[3]);
			respond([id,cmdId,'pageRenderBase64Done', result]);
			break;
		case 'pageSet':
            //eval('request[4].header.contents = phantom.callback('+'function(pageNum, numPages) { return "<h1>"+pageNum + "/" + numPages; }'+')');

            /*if(typeof(
             request[4].header.contents = phantom.callback(function(pageNum, numPages) {
             return '<img class="footer-img" src="data:image/png;base64,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" >';
             });
             } */
            if(typeof(request[4].footer)!='undefined'){
        	var footnotes;
        	var footerlogo;
        	var footerposition_left = 380;
        	if(typeof(request[4].footer.footnotes)!='undefined'&&request[4].footer.footnotes.length>0){ 
        	    footnotes = request[4].footer.footnotes;  
        	}
        	if(typeof(request[4].footer.logo)!='undefined'){ 
        	    footerlogo = request[4].footer.logo;  
        	}
        	if(typeof(request[4].footer.orientation)!='undefined'){ 
        	    if(request[4].footer.orientation=='landscape'){
        		footerposition_left = 540 
        	    } 
        	}
        	request[4].footer.contents = phantom.callback(function(pageNum, numPages) {
                    var footerhtml ='';
                    footerhtml += '<div class="footnotes">';
                    if(typeof(footnotes)!='undefined'){
                        for(var i=0;i<footnotes.length;i++){
                            footerhtml += '<div class="footnote" style="margin-left:30px; font-size: 12px; color:#333; ">'+footnotes[i]+'</div>';
                        }
                    }
                    footerhtml += '</div>';
                    footerhtml +='<div style="position:relative;" class="bottom-footer-wrapper">';
                    footerhtml +='<div style="float:left; margin-top:20px; margin-left:30px; font-family:Arial;" class="datetime-footer">'+toLocaleDateTimeString(new Date())+'</div>';
                    footerhtml +='<div style="margin-top:20px; float:right; margin-right:30px; font-family:Arial;" class="footer-page-num">Page '+pageNum+' of  '+numPages+'</div>';
                    footerhtml +='<img width="200" style="float:left; position:absolute; left:'+footerposition_left+';" class="footer-img" src="'+footerlogo+'" >';
                    footerhtml +='</div>';
                    return footerhtml;
                });
            }

            // eval('request[4].footer.contents = phantom.callback('+request[4].footer.contents+')');

            page[request[3]]=request[4];
            respond([id,cmdId,'pageSetDone']);
            break;
		case 'pageGet':
			var result=page[request[3]];
			respond([id,cmdId,'pageGetDone',JSON.stringify(result)]);
			break;
		case 'pageSetFn':
			page[request[3]] = eval('(' + request[4] + ')')
			break;
		case 'pageSetViewport':
			page.viewportSize = {width:request[3], height:request[4]};
			respond([id,cmdId,'pageSetViewportDone']);
			break;
		default:
			console.error('unrecognized request:'+request);
			break;
		}
	}
	//console.log('command:'+parts[1]);
	return;
};

controlpage.onConsoleMessage=function(msg){
	return console.log('console msg:'+msg);
};

controlpage.open('http://127.0.0.1:'+port+'/',function(status){
	//console.log(status);
});

function padLeft(nr, n, str){
    return Array(n-String(nr).length+1).join(str||'0')+nr;
}

function toLocaleDateTimeString(date){
    return date.getFullYear()+'-'+padLeft((date.getMonth()+1).toString(),2)+'-'+ padLeft(date.getDate(),2) + ' ' + padLeft(date.getHours(),2)+':'+padLeft(date.getMinutes(),2)+':'+padLeft(date.getSeconds(),2);
}