import { Game, Player } from "./src/engine/game";

const game = new Game([
  new Player("1"),
  new Player("2"),
  new Player("3"),
  new Player("4"),
]);

const winner = game.start();

console.log(game.table.map((row) => row.map((card) => card.value)));
console.log(
  game.players.map((player) =>
    player.graveyard.reduce((points, card) => points + card.points, 0)
  )
);
