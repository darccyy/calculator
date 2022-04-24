const buttons = [
  ["x²", "^"],
  ["C", () => erase(), "Clear All"],
  ["🅇", () => backspace(), "Backspace"],
  ["÷", "/"],
  7,
  8,
  9,
  ["×", "*"],
  4,
  5,
  6,
  "-",
  1,
  2,
  3,
  "+",
  ".",
  0,
  "(",
  ")",
];

function init() {
  $("#math").text("");
  run();

  $("#buttons").html(
    buttons.map((item, i) => {
      var text, method, title;
      if (item === null) {
        text = "";
        method = null;
      } else if (typeof item === "object") {
        text = item[0];
        method = item[1] || text;
        title = item[2];
      } else {
        text = item;
        method = text;
      }

      if (method !== null) {
        if (typeof method === "function") {
          method = method.toString().slice(6);
        } else {
          method = `concat('${method}')`;
        }
      }

      var isNumber = typeof text === "number" ? "number" : "";

      return `<article><button onclick="${method}; run()" title="${
        title || ""
      }" class="${isNumber}">${text}</button></article>`;
    }),
  );
}

// Solve given equation
function run() {
  //~ console.clear();
  $("#error").text("");
  const math = $("#math").val();

  //~ console.log("\nPARSE");
  try {
    var { tree } = parse(math);
  } catch (err) {
    $("#error").text(err);
    return;
  }

  //~ console.log(tree);
  $("#output").text(JSON.stringify(tree, null, 2));

  //~ console.log("\nSOLVE");
  try {
    var answer = solve(tree);
  } catch (err) {
    $("#error").text(err);
    return;
  }
  //~ console.log(answer);
  $("#answer").text(answer === null ? "" : answer);
}

// Solve parsed equation
function solve(tree, iter) {
  // Prevent infinite loop
  iter = iter || 0;
  if (iter >= 20) {
    throw "Too much recursion";
  }
  //~ console.log("SOLVE:", tree);

  switch (tree.length) {
    case 0: {
      return null;
    }

    case 1: {
      return tree[0].constructor === Array ? solve(tree[0]) : tree[0].value;
    }

    case 3: {
      return equate(
        tree[1].value,
        tree[0].constructor === Array ? solve(tree[0]) : tree[0].value,
        tree[2].constructor === Array ? solve(tree[2]) : tree[2].value,
      );
    }

    default: {
      throw "Invalid format";
    }
  }
}

// Solve simple equation of 3 parts
function equate(operator, a, b) {
  //~ console.log("EQUATE:", operator, a, b);
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
  var symbols = "^/*-+";
  for (var i in symbols) {
    var symbol = symbols[i];
    //~ console.log("symbol:", symbol);
    for (var j = 0; j < tree.length; j++) {
      var arg = tree[j];
      if (arg.operator && arg.value === symbol) {
        //~ console.log("move:", tree[j - 1], arg, tree[j + 1]);
        tree = [
          ...tree.slice(0, j - 1),
          [tree[j - 1], arg, tree[j + 1]],
          ...tree.slice(j + 2),
        ];
        //~ console.log(tree);
      }
    }
  }
  return tree;
}

// Parse raw equation
function parse(string, iter) {
  // Prevent infinite loop
  iter = iter || 0;
  if (iter >= 20) {
    throw "Too much recursion";
  }
  //~ console.log("PARSE:", string);

  var tree = [];
  var isEarlyReturn = false; // Set to true in loop on closing bracket; After loop: Error if iter is 0
  var build = ""; // Building a number by char
  for (var i = 0; i < string.length; i++) {
    var char = string[i];
    //~ console.log("char:", char);

    // Space or new line
    if (" \n".includes(char)) {
      if (build) {
        var value = parseFloat(build);
        if (isNaN(value)) {
          throw `Not a number '${build}'`;
        }
        tree.push({ value });
      }
      build = "";
      continue;
    }

    // Open bracket
    if (char === "(") {
      // Recurse
      //~ console.log("     --->>");
      var parsed = parse(string.slice(i + 1), iter + 1);
      //~ console.log("     <<---");
      //~ console.log("index:", parsed.index);
      //~ console.log("(tree):", parsed.tree);

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
      //~ console.log("back:", i);
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
          //~ console.log("PLUS/MINUS");
          build += char;
          continue;
        }

        throw `Unexpected token '${char}'`;
      }

      // Add build and operator
      if (build) {
        var value = parseFloat(build);
        if (isNaN(value)) {
          throw `Not a number '${build}'`;
        }
        tree.push({ value });
      }
      tree.push({ operator: true, value: char });
      build = "";
      continue;
    }

    // Number
    if ("0123456789.".includes(char)) {
      build += char;
      continue;
    }

    throw `Invalid character: '${char}'`;
  }
  // Final number in scope
  if (build) {
    var value = parseFloat(build);
    if (isNaN(value)) {
      throw `Not a number '${build}'`;
    }
    tree.push({ value });
  }

  // Check if final token is operator
  //~ console.log("(tree):", tree);
  //~ console.log(">> (last):", tree[tree.length - 1]);
  if (tree[tree.length - 1]?.operator) {
    throw `Nothing after operator '${tree[tree.length - 1].value}' in scope`;
  }

  if (isEarlyReturn) {
    if (iter <= 0) {
      throw "Close bracket mismatch";
    }
    return { tree, index: i };
  }

  //~ console.log("Final:", iter);
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
