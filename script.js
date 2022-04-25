const buttons = [
  ["x²", "Exponent", "^"],
  ["C", "Clear All", () => erase()],
  ["🅇", "Backspace", () => backspace()],
  ["÷", "Divide", "/"],
  [7, "Seven"],
  [8, "Eight"],
  [9, "Nine"],
  ["×", "Multiply", "*"],
  [4, "Four"],
  [5, "Five"],
  [6, "Six"],
  ["-", "Subtract"],
  [1, "One"],
  [2, "Two"],
  [3, "Three"],
  ["+", "Add"],
  [".", "Decimal Point"],
  [0, "Zero"],
  ["(", "Open bracket"],
  [")", "Close bracket"],
];

// Fix height of textarea bc css cannot :(
function textAreaAdjust() {
  var element = $("#math");
  element.css("height", "0px");
  element.css("height", element[0].scrollHeight - 10 + "px");
}

// Fix font size of answer
function answerFontSizeAdjust() {
  var element = $("#answer");
  element.css(
    "font-size",
    100 - Math.max(0, element.text().length - 18) * 4 + "%",
  );
}

function init() {
  $("#math").text("");
  createButtons();
  run();
}

// Create buttons
function createButtons() {
  $("#buttons").html(
    buttons.map((item, i) => {
      if (!item) {
        return "";
      }

      var [text, title, method] = item;

      if (item.length < 1) {
        text = "⠀";
        title = "";
        method = "";
      } else {
        if (!method) {
          method = text;
        }

        if (typeof method === "function") {
          method = method.toString().slice(6);
        } else {
          method = `concat('${method}')`;
        }
      }

      return `<article><button onclick="${
        method ? method + "; run()" : ""
      }" title="${title || ""}" class="${
        (typeof text === "number" ? "number " : "") +
        (item.length < 1 ? "blank " : "")
      }">${text}</button></article>`;
    }),
  );
}

// Solve given equation
function run() {
  textAreaAdjust();

  $("#error").text("");
  const math = $("#math").val();

  // True mathematics
  var truths = [
    [21, "You stupid!", ["9+10", "10+9"]],
    [5, "Trust me.", ["2+2"]],
  ];
  var stripped = math.replace(/[\(\) \n]/, "");
  for (var i in truths) {
    if (truths[i][2].includes(stripped)) {
      $("#output").text(truths[i][1]);
      $("#answer").text(truths[i][0]);
      return;
    }
  }

  // Parse to tree
  try {
    var answer = parseLines(math);
  } catch (err) {
    $("#error").text(err);
    return;
  }

  if (answer === Infinity) {
    $("#error").text("Maximum value");
  } else if (answer === -Infinity) {
    $("#error").text("Minimum value");
  }

  $("#answer").text(answer === null ? "" : answer);
  answerFontSizeAdjust();
}

// Solve parsed equation
function solve(tree, iter) {
  // Prevent infinite loop
  iter = iter || 0;
  if (iter >= 20) {
    throw "Too much recursion";
  }

  if (!storage) {
    throw "Undefined storage";
  }

  switch (tree.length) {
    case 0: {
      return null;
    }

    case 1: {
      return getItemValue(tree[0], iter);
    }

    case 2: {
      return getItemValue(tree[0], iter) * getItemValue(tree[1], iter);
    }

    case 3: {
      return equate(
        tree[1].value,
        getItemValue(tree[0], iter),
        getItemValue(tree[2], iter),
      );
    }

    default: {
      throw "Invalid format";
    }
  }
}

// Get parsed value of item in tree
function getItemValue(item, iter) {
  if (item.constructor === Array) {
    return solve(item, iter + 1);
  }
  if (item.pronumeral) {
    if (storage[item.value] || storage[item.value] === 0) {
      return storage[item.value];
    }
    throw `Unknown pronumeral '${item.value}'`;
  }
  return item.value;
}

// Solve simple equation of 3 parts
function equate(operator, a, b) {
  switch (operator) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return a / b;
    case "^":
      return a ** b;
    default:
      throw `Unknown operator '${operator}'`;
  }
}

// Fix order of operations
function order(tree) {
  if (tree.length < 4) {
    return tree;
  }

  var symbols = "^/*-+";
  for (var i in symbols) {
    var symbol = symbols[i];
    for (var j = 0; j < tree.length; j++) {
      var arg = tree[j];
      if (arg.operator && arg.value === symbol) {
        tree = [
          ...tree.slice(0, j - 1),
          [tree[j - 1], arg, tree[j + 1]],
          ...tree.slice(j + 2),
        ];
      }
    }
  }

  return tree;
}

// Parse multiple lines
var storage;
function parseLines(string) {
  // Variables, $ is return
  storage = { $: null, PI: Math.PI, E: Math.E };

  var lines = string.split(/[\n;]/gm);
  var source = [];
  for (var i in lines) {
    var line = lines[i];
    if (!line) {
      continue;
    }

    var params = line.split("=");
    if (
      params.length === 2 &&
      params[0].replace(/[abcdefghijklmnopqrstuvwxyz \n]/gim, "") === ""
    ) {
      var key = params[0].replace(/[ \n]/, "");
      if (Object.keys(storage).includes(key)) {
        throw `Pronumeral '${key}' already exists`;
      }
      var tree = parse(params[1]).tree;
      source.push({ set: key, tree });
      var value = solve(tree);
      if (!value && value !== 0) {
        throw "Value undefined";
      }
      storage[key] = value;
      storage.$ = value;
      continue;
    }

    var parsed = parse(line);
    source.push(parsed.tree);
    storage.$ = solve(parsed.tree);
  }

  $("#output").text(JSON.stringify(source, null, 2));
  return storage.$;
}

// Parse raw equation
function parse(string, iter) {
  // Prevent infinite loop
  iter = iter || 0;
  if (iter >= 20) {
    throw "Too much recursion";
  }
  if (!storage) {
    throw "Undefined storage";
  }

  var tree = [];
  var isEarlyReturn = false; // Set to true in loop on closing bracket; After loop: Error if iter is 0
  var build = ""; // Building a number by char
  var isPronumeral = false; // If build is pronumeral
  for (var i = 0; i < string.length; i++) {
    var char = string[i];

    // Space or new line
    if (" \n".includes(char)) {
      if (build) {
        if (isPronumeral) {
          tree.push({ value: build, pronumeral: true });
        } else {
          var value = parseFloat(build);
          if (isNaN(value)) {
            throw `Not a number '${build}'`;
          }
          tree.push({ value });
        }
        isPronumeral = false;
      }
      build = "";
      continue;
    }

    // Open bracket
    if (char === "(") {
      // Recurse
      var parsed = parse(string.slice(i + 1), iter + 1);

      // If nothing in brackets - tree empty
      if (parsed.tree.length < 1) {
        throw "Empty brackets";
      }
      tree.push(parsed.tree);

      // idk
      if (parsed.index < 0) {
        throw "Premature termination";
      }

      // Set index to after just-parsed section
      i += parsed.index + 1;
      continue;
    }

    // Close bracket
    if (char === ")") {
      isEarlyReturn = true; // See declaration
      break;
    }

    // Operator
    if ("+-*/^".includes(char)) {
      // If first token in scope OR after another operator, skip if still building
      if (
        (!tree[tree.length - 1] || tree[tree.length - 1].operator) &&
        !build
      ) {
        // Check for use as positive / negative marker
        if ("+-".includes(char)) {
          build += char;
          continue;
        }

        throw `Unexpected token '${char}'`;
      }

      // Add build and operator
      if (build) {
        if (isPronumeral) {
          tree.push({ value: build, pronumeral: true });
        } else {
          var value = parseFloat(build);
          if (isNaN(value)) {
            throw `Not a number '${build}'`;
          }
          tree.push({ value });
        }
        isPronumeral = false;
      }
      tree.push({ operator: true, value: char });
      build = "";
      continue;
    }

    // Number
    if ("0123456789.".includes(char)) {
      if (isPronumeral) {
        throw `Cannot use number '${char}' in pronumeral`;
      }
      build += char;
      continue;
    }

    // Pronumeral
    if (/[abcdefghiklmnopqrstuvwxyz \n]/gim.test(char)) {
      if (build && !isPronumeral) {
        throw `Cannot use character '${char}' in number`;
      }
      build += char;
      isPronumeral = true;
      continue;
    }

    throw `Invalid character: '${char}'`;
  }
  // Final number in scope
  if (build) {
    if (isPronumeral) {
      tree.push({ value: build, pronumeral: true });
    } else {
      var value = parseFloat(build);
      if (isNaN(value)) {
        throw `Not a number '${build}'`;
      }
      tree.push({ value });
    }
    isPronumeral = false;
  }

  // Check if final token is operator
  if (tree[tree.length - 1]?.operator) {
    throw `Nothing after operator '${tree[tree.length - 1].value}'`;
  }

  if (isEarlyReturn) {
    if (iter <= 0) {
      throw "Close bracket mismatch";
    }
    return { tree, index: i };
  }

  if (iter > 0) {
    throw "Open bracket mismatch";
  }
  return { tree: order(tree), index: -1 };
}

// Button functions
function concat(char) {
  $("#math").val($("#math").val() + char);
}

function erase() {
  $("#math").val("");
}

function backspace() {
  $("#math").val($("#math").val().slice(0, -1));
}
