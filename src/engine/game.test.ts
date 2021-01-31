import test from "ava";
import { Game, Player, settings } from "./game";

function isAscending(arr: any[]) {
  return arr.every(function (x, i) {
    return i === 0 || x >= arr[i - 1];
  });
}

test("game initializes unique deck", (t) => {
  const game = new Game([new Player()]);
  const ref: { [key: number]: boolean } = {};
  game.deck.forEach((card) => {
    if (!ref[card.value]) {
      ref[card.value] = true;
    } else {
      t.fail();
    }
  });
  t.pass();
});

test("game finishes with ascending rows", (t) => {
  const game = new Game([
    new Player(),
    new Player(),
    new Player(),
    new Player(),
  ]);
  game.start();
  game.table.rows.forEach((row) => {
    if (!isAscending(row.map((card) => card.value))) {
      t.fail();
    }
  });
  t.pass();
});

test("no. cards played are correct", (t) => {
  const game = new Game([
    new Player(),
    new Player(),
    new Player(),
    new Player(),
  ]);
  game.start();
  let cardsPlayed = game.deck.length;
  cardsPlayed += game.players.reduce(
    (count, player) => count + player.graveyard.length,
    0
  );
  cardsPlayed += game.table.rows.reduce((count, row) => count + row.length, 0);
  t.is(cardsPlayed, settings.maxCards);
});
