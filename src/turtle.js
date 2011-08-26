define(['utils'], function(utils) {
    // reference http://el.media.mit.edu/logo-foundation/logo/turtle.html

    var context = function(elem) {
        //var canvas = $(elem)[0];
        //var ctx = canvas.getContext("2d");
        // XXX
        var canvas = null;
        var ctx = null;

        return {
            center: function() {
                ctx.setTransform(1, 0, 0, 1, 0, 0);

                ctx.translate(canvas.width / 2, canvas.height / 2);
            },
            translate: function(x, y) {
                ctx.translate(x, y);
            },
            rotate: function(degrees) {
                ctx.rotate(degrees / 360 * 2 * Math.PI);
            },
            line: function(distance) {
                ctx.beginPath();

                ctx.moveTo(0, 0);
                ctx.lineTo(0, distance);

                ctx.stroke();
            },
            clear: function() {
                ctx.save();

                ctx.setTransform(1, 0, 0, 1, 0, 0);

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                ctx.restore();
            }
        };
    };

    var turtle = function(ctx) {
        if(!ctx) {
            return null;
        }

        // make sure ctx contains all appropriate methods
        var containsMethods = utils.contains(utils.keys(ctx), utils.keys(context()));

        if(!containsMethods) {
            return null;
        }

        var penDown = true;

        var isRecording = false;
        var currentRecording = [];
        var recordingName = '';
        var penWasDown = false;

        var repeating = false;

        var commands = {
            forward: function(distance) {
                if(penDown) {
                    ctx.line(distance);
                }

                ctx.translate(0, distance);
            },
            backward: function(distance) {
                if(penDown) {
                    ctx.line(distance);
                }

                ctx.translate(0, -distance);
            },
            rotate: function(degrees) {
                ctx.rotate(degrees);
            },
            penDown: function() {
                penDown = true;
            },
            penUp: function() {
                penDown = false;
            },
            reset: function() {
                ctx.center();
                ctx.rotate(180);

                penDown = true;
            },
            repeat: function() {
                var times = arguments[0];

                // this disables recording of repeated commands. we need to record just repeat call
                repeating = true;

                for(var i = 0; i < times; i++) {
                    for(var j = 1; j < arguments.length; j += 2) {
                        var name = arguments[j];
                        var arg = arguments[j + 1];

                        commands[name].call({}, arg);
                    }
                }

                var repeating = false;
            }
        };

        // these won't get recorded
        var recordCommands = {
            record: function(name) {
                isRecording = true;
                recordingName = name;
                penWasDown = penDown;

                penDown = false;
            },
            stop: function() {
                var recording = currentRecording.slice(0); // clone

                commands[recordingName] = wrapCommand(recordingName,
                    function() {
                        var fillArgs;

                        if(arguments.length == 1 && arguments[0]) {
                            fillArgs = arguments[0];
                        }

                        var constructArgs = function(args) {            
                            if(fillArgs) {
                                for(var i = 0; i < args.length; i++) {
                                    var arg = args[i];

                                    if(!arg) {
                                        args[i] = fillArgs;
                                    }
                                    else if(typeof(arg) == 'string' && arg.match('^<[a-zA-Z]*>$')) {
                                        var argName = arg.substring(1, arg.length - 1);

                                        args[i] = fillArgs[argName];
                                    }
                                }
                            }

                            return args;
                        };

                        utils.each(function(i, part) {
                            var args = constructArgs(part.args);

                            commands[part.name].apply({}, args);
                        }, recording);
                    }
                    );

                isRecording = false;
                currentRecording = [];

                penDown = penWasDown;
            },
            penState: function() {
                return penDown? 'down': 'up';
            }
        };

        var wrapCommand = function(name, command) {    
            return function() {
                command.apply({}, arguments);

                if(isRecording && !repeating) {
                    currentRecording.push({
                        name: name,
                        args: arguments
                    });
                }
            };
        };

        utils.each(function(k, v) {
            commands[k] = wrapCommand(k, v);
        }, commands);

        commands = utils.extend(commands, recordCommands);

        commands.reset();

        return commands;
    };
    
    // API demo
    if(false) {
        var world = context('#world');
        var joe = turtle(world); // sits at origin facing north pen down

        joe.record('box');
        joe.repeat(4, 'forward', '<radius>', 'rotate', 90);
        joe.stop();

        joe.record('flower');
        joe.repeat('<parts>', 'box', null, 'rotate', '<rotation>');
        joe.stop();

        // TODO
        if(false) {
            joe.record('spiral');
            joe.stopIf('<size> > 100');
            joe.forward('<size>');
            joe.rotate('<angle>');
            joe.spiral({
                size: '<size> + 2', 
                angle: '<angle>'
            }); // figure out how to deal with recursion step while recording
            joe.stop();
        }

        // TODO: eliminate this. recording should not mess up ctx
        joe.reset();

        joe.flower({
            parts: 36, 
            rotation: 10, 
            radius: 90
        });
    }

    return {
        context: context,
        turtle: turtle
    };
});