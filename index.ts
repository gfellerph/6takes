import { Game, Player, PlayerType } from "./src/engine/game";

async function play() {
  const game = new Game([
    new Player("Console", PlayerType.Console),
    new Player("Player 2"),
    new Player("Player 3"),
    new Player("Player 4"),
  ]);

  await game.start();

  //console.log(game.table.rows.map((row) => row.map((card) => card.value)));
  /* console.log(
    game.players.map((player) =>
      player.graveyard.reduce((points, card) => points + card.points, 0)
    )
  ); */
}

play();
