"use strict";

function summing(counter) {
  if (counter <= 0) {
    return 0;
  }
  console.trace("HERE: " + counter);
  return counter + summing(counter - 1);
}

summing(5);
// This will print out the recursive calls currently on the stack. This sort
// of behavior will lead to a stack overflow.
