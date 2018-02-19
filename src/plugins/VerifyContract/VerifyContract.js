/*globals define*/
/*eslint-env node, browser*/

/**
 * Generated by PluginGenerator 2.16.0 from webgme on Sun Feb 11 2018 14:52:22 GMT-0600 (CST).
 * A plugin that inherits from the PluginBase. To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 */

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'common/util/ejs',
    'scsrc/util/utils',
    'scsrc/templatesForBIP/ejsCache',
    'scsrc/parsers/solidity'
], function (
    PluginConfig,
    pluginMetadata,
    PluginBase,
    ejs,
    utils,
    ejsCache,
    solidity) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of VerifyContract.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin VerifyContract.
     * @constructor
     */
    var VerifyContract = function () {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    };

    /**
     * Metadata associated with the plugin. Contains id, name, version, description, icon, configStructue etc.
     * This is also available at the instance at this.pluginMetadata.
     * @type {object}
     */
    VerifyContract.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    VerifyContract.prototype = Object.create(PluginBase.prototype);
    VerifyContract.prototype.constructor = VerifyContract;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    VerifyContract.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this,
            nodeObject;

        self.loadNodeMap(self.activeNode)
          .then(function (nodes) {
              return VerifyContract.getVerificationResults(self, nodes, self.activeNode);
        });


        // This will save the changes. If you don't want to save;
        // exclude self.save and call callback directly from this scope.
        self.save('VerifyContract updated model.')
            .then(function () {
                self.result.setSuccess(true);
                callback(null, self.result);
            })
            .catch(function (err) {
                // Result success is false at invocation.
                callback(err, self.result);
            });

    };

    VerifyContract.getVerificationResults = function (self, nodes, activeNode, callback) {
        var contract;
        console.log('getVerificationResults');
        for (contract of VerifyContract.prototype.getContractPaths.call(self, nodes))
          VerifyContract.prototype.verifyContract.call(self, nodes, contract);
    };

  VerifyContract.prototype.verifyContract = function (nodes, contract) {
    var self = this,
        core = self.core,
        node,
        name,
        childPath,
        child,
        childName,
        pathToName = {},
        states = [],
        initialState,
        finalStates = [],
        transitions = [],
        transition,
        model, bipModel;

    console.log('verifyContract');
    node = nodes[contract];
    name = self.core.getAttribute(node, 'name');

    for (childPath of  self.core.getChildrenPaths(node))
      pathToName[childPath] = self.core.getAttribute(nodes[childPath], 'name');

    for (childPath of self.core.getChildrenPaths(node)) {
      child = nodes[childPath];
      childName = self.core.getAttribute(child, 'name');

      if (self.isMetaTypeOf(child, self.META.State))
        states.push(childName);
      else if (self.isMetaTypeOf(child, self.META.InitialState)) {
        states.push(childName);
        initialState = childName;
      }
      else if (self.isMetaTypeOf(child, self.META.FinalState)) {
        states.push(childName);
        finalStates.push(childName);
      }
      else if (self.isMetaTypeOf(child, self.META.Transition)) {
        transition = {
          'name': childName,
          'src': pathToName[core.getPointerPath(child, 'src')],
          'dst': pathToName[core.getPointerPath(child, 'dst')],
          'guards': core.getAttribute(child, 'guards'),
          'input': core.getAttribute(child, 'input'),
          'output': core.getAttribute(child, 'output'),
          'statements': core.getAttribute(child, 'statements'),
          'tags': core.getAttribute(child, 'tags')
        };
        transitions.push(transition);
      }
    }

    model = {
      'name': name,
      'states': states,
      'transitions': transitions,
      'initialState': initialState,
      'finalStates': finalStates,
      'initialAction': self.core.getAttribute(node, 'initialAction'),
      'fallbackAction': self.core.getAttribute(node, 'fallbackAction')
    };

    console.log('beforeConformance');
    model = VerifyContract.prototype.conformance.call(self, model);
    console.log('afterConformance');
    model = VerifyContract.prototype.augmentModel.call(self, model);
    console.log('afterAugmentation');
    bipModel = ejs.render(ejsCache.contractType.complete, model);

    console.log('hi');
    console.log(bipModel);
    //self.logger.error('hi');
    //self.logger.error(bipModel);

    // TODO: generate BIP and verify
  }

  VerifyContract.prototype.conformance = function (model) {
    var self = this,
        state,
        transition,
        states = [],
        transitions = [],
        initialState = model['initialState'];

    for (state of model['states']) {
      states.push(state);
      if (model['fallbackAction'].trim().length != 0) {
        transitions.push({
          'name': state + "_fallback",
          'src': state,
          'dst': state,
          'guards': "",
          'input': "",
          'output': "",
          'statements': model['fallbackAction'],
          'tags': "payable" // TODO: check if this is the correct syntax for tags!
        });
      }
    }

    for (transition of model['transitions'])
      transitions.push(transition);

    if (model['initialAction'].trim().length != 0) {
      states.push("pre_constructor");
      initialState = "pre_constructor";
      transitions.push({
        'name': model['name'],
        'src': "pre_constructor",
        'dst': model['initialState'],
        'guards': "",
        'input': "",
        'output': "",
        'statements': model['initialAction'],
        'tags': ""
      });
    }

    return {
      'name': model['name'],
      'states': states,
      'transitions': transitions,
      'initialState': initialState,
      'finalStates': model['finalStates']
    };
  }

  VerifyContract.prototype.augmentModel = function (model) {
    var self = this,
        state,
        transition,
        augmentedStates = [],
        augmentedTransitions = [];

    for (state of model['states'])
      augmentedStates.push(state);

    for (transition of model['transitions']) {
      augmentedStates.push(transition['name']);
      augmentedTransitions.push({
        'name': transition['name'] + '_guard',
        'src': transition['src'],
        'dst': transition['name'],
        'guards': transition['guards'],
        'input': transition['input'],
        'output': transition['output'],
        'statements': "",
        'tags': transition['tags']
      });
      if (false) // TODO: if statements cannot raise exception
        VerifyContract.prototype.augmentStatement.call(self, augmentedStates, augmentedTransitions,
          "{" + transition['statements'] + "}", transition['name'], transition['dst'], transition['dst']);
      else {
        augmentedTransitions.push({
          'name': transition['name'] + '_revert',
          'src': transition['name'],
          'dst': transition['src'],
          'guards': "revert", // TODO: this needs to be a special value
          'input': "",
          'output': "",
          'statements': "",
          'tags': ""
        });
        augmentedStates.push(transition['name'] + "_no_revert");
        augmentedTransitions.push({
          'name': transition['name'] + '_no_revert',
          'src': transition['name'],
          'dst': transition['name'] + '_no_revert',
          'guards': "no revert", // TODO: this needs to be a special value
          'input': "",
          'output': "",
          'statements': "",
          'tags': ""
        });
        VerifyContract.prototype.augmentStatement.call(self, augmentedStates, augmentedTransitions,
          "{" + transition['statements'] + "}", transition['name'] + '_no_revert', transition['dst'], transition['dst']);
      }
    }

    return {
      'name': model['name'],
      'states': augmentedStates,
      'transitions': augmentedTransitions,
      'initialState': model['initialState'],
      'finalStates': model['finalStates']
    };
  }

  VerifyContract.prototype.augmentStatement = function (augmentedStates, augmentedTransitions, statement, src, dst, ret) {
    var self = this,
        code,
        parsed,
        body,
        parsedStatement,
        i,
        state,
        condition;

//    statement = "for (uint i = 0; i < 10; i++) msg.sender.transfer(10);";
//    statement = "if (1 == 1) msg.sender.transfer(10);";

    if (!(statement.trim().endsWith("}") || statement.trim().endsWith(";") || (statement.trim().length == 0)))
      statement = statement + ";";
    code = "contract Contract { function Function() { " + statement + " } } ";
    parsed = solidity.parse(code);
    body = parsed["body"][0]["body"][0]["body"]["body"];

    if (body.length == 0) { // empty action
      augmentedTransitions.push({
        'name': augmentedTransitions.length.toString(),
        'src': src,
        'dst': dst,
        'guards': "",
        'input': "",
        'output': "",
        'statements': "",
        'tags': ""
      });
    }
    else {
      parsedStatement = body[0];

      if (parsedStatement["type"] == "BlockStatement") { // compound statement
        body = parsedStatement["body"];
        if (body.length > 1) {
          state = augmentedStates.length.toString();
          for (i = 1; i < body.length; i++)
            augmentedStates.push(state + "_" + i);
          VerifyContract.prototype.augmentStatement.call(self, augmentedStates, augmentedTransitions,
            code.substring(body[0]['start'], body[0]['end']), src, state + "_1", ret);
          for (i = 1; i < body.length - 1; i++)
            VerifyContract.prototype.augmentStatement.call(self, augmentedStates, augmentedTransitions,
              code.substring(body[i]['start'], body[i]['end']), state + "_" + i, state + "_" + (i + 1), ret);
          VerifyContract.prototype.augmentStatement.call(self, augmentedStates, augmentedTransitions,
            code.substring(body[body.length - 1]['start'], body[body.length - 1]['end']), state + "_" + (body.length - 1), dst, ret);
        }
        else if (body.length == 1) {
          VerifyContract.prototype.augmentStatement.call(self, augmentedStates, augmentedTransitions,
            code.substring(body[0]['start'], body[0]['end']), src, dst, ret);
        }
        else {
          augmentedTransitions.push({
            'name': augmentedTransitions.length.toString(),
            'src': src,
            'dst': dst,
            'guards': "",
            'input': "",
            'output': "",
            'statements': "",
            'tags': ""
          });
        }
      }
      else if ((parsedStatement["type"] == "ExpressionStatement") || (parsedStatement["type"] == "VariableDeclaration") || (parsedStatement["type"] == "VariableDeclarationTuple")) {
        augmentedTransitions.push({
          'name': augmentedTransitions.length.toString(),
          'src': src,
          'dst': dst,
          'guards': "",
          'input': "",
          'output': "",
          'statements': statement,
          'tags': ""
        });
      }
      else if (parsedStatement["type"] == "ReturnStatement") {
        augmentedTransitions.push({
          'name': augmentedTransitions.length.toString(),
          'src': src,
          'dst': ret,
          'guards': "",
          'input': "",
          'output': "",
          'statements': statement,
          'tags': ""
        });
      }
      else if (parsedStatement["type"] == "IfStatement") {
        condition = code.substring(parsedStatement["test"]["start"], parsedStatement["test"]["end"]);
        state = augmentedStates.length.toString();
        // true branch
        augmentedStates.push(state + "_T");
        augmentedTransitions.push({
          'name': augmentedTransitions.length.toString(),
          'src': src,
          'dst': state + "_T",
          'guards': condition,
          'input': "",
          'output': "",
          'statements': "",
          'tags': ""
        });
        VerifyContract.prototype.augmentStatement.call(self, augmentedStates, augmentedTransitions,
          code.substring(parsedStatement["consequent"]["start"], parsedStatement["consequent"]["end"]), state + "_T", dst, ret);
        if (parsedStatement["alternate"] == null) { // no false branch
          augmentedTransitions.push({
            'name': augmentedTransitions.length.toString(),
            'src': src,
            'dst': dst,
            'guards': "!(" + condition + ")",
            'input': "",
            'output': "",
            'statements': "",
            'tags': ""
          });
        }
        else { // false branch
          augmentedStates.push(state + "_F");
          augmentedTransitions.push({
            'name': augmentedTransitions.length.toString(),
            'src': src,
            'dst': state + "_F",
            'guards': "!(" + condition + ")",
            'input': "",
            'output': "",
            'statements': "",
            'tags': ""
          });
          VerifyContract.prototype.augmentStatement.call(self, augmentedStates, augmentedTransitions,
            code.substring(parsedStatement["alternate"]["start"], parsedStatement["alternate"]["end"]), state + "_F", dst, ret);
        }
      }
      else if (parsedStatement["type"] == "ForStatement") {
        state = augmentedStates.length.toString();
        condition = code.substring(parsedStatement["test"]["start"], parsedStatement["test"]["end"]);
        augmentedStates.push(state + "_I");
        augmentedStates.push(state + "_C");
        augmentedStates.push(state + "_B");
        VerifyContract.prototype.augmentStatement.call(self, augmentedStates, augmentedTransitions,
          code.substring(parsedStatement["init"]["start"], parsedStatement["init"]["end"]), src, state + "_I", ret);
        augmentedTransitions.push({
          'name': augmentedTransitions.length.toString(),
          'src': state + "_I",
          'dst': dst,
          'guards': "!(" + condition + ")",
          'input': "",
          'output': "",
          'statements': "",
          'tags': ""
        });
        augmentedTransitions.push({
          'name': augmentedTransitions.length.toString(),
          'src': state + "_I",
          'dst': state + "_C",
          'guards': condition,
          'input': "",
          'output': "",
          'statements': "",
          'tags': ""
        });
        VerifyContract.prototype.augmentStatement.call(self, augmentedStates, augmentedTransitions,
          code.substring(parsedStatement["body"]["start"], parsedStatement["body"]["end"]), state + "_C", state + "_B", ret);
        VerifyContract.prototype.augmentStatement.call(self, augmentedStates, augmentedTransitions,
          code.substring(parsedStatement["update"]["start"], parsedStatement["update"]["end"]), state + "_B", state + "_I", ret);
      }
      else throw "Unsupported statement type!";
    }
  }

  VerifyContract.prototype.getContractPaths = function (nodes) {
    var self = this,
            path,
            node,
            //Using an array for the multiple contracts extention
            contracts = [];

        for (path in nodes) {
            node = nodes[path];
            if (self.isMetaTypeOf(node, self.META.Contract)) {
                contracts.push(path);
            }
        }
        return contracts;
    };


    return VerifyContract;
});
