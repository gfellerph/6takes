import { nanoid } from "nanoid";

enum PlayerType {
  Player,
  AI,
}

export const settings = {
  rows: 4,
  maxHand: 10,
  maxCards: 104,
  takes: 6,
};

export class Table {
  public rows: Card[][];

  constructor() {
    this.rows = [];
  }

  public getHeadCards(): [number, number][] {
    return this.rows.reduce((head, row: Card[], index: number) => {
      head.push([row[row.length - 1].value, index]);
      return head;
    }, [] as Array<[number, number]>);
  }

  public getCheapestRowIndex(): number {
    const pointsPerRow = this.rows.map((row) => {
      return row.reduce((score, card) => score + card.points, 0);
    });
    const min = Math.min.apply(null, pointsPerRow);
    return pointsPerRow.indexOf(min);
  }

  public predictRowIndex(value: number): number {
    const [, rowIndex] = this.getHeadCards()
      .sort((a, b) => b[0] - a[0])
      .find(([cardValue]) => value > cardValue) || [null, -1];

    return rowIndex;
  }

  public getDangerousRowIndices() {
    return this.rows
      .filter((row) => row.length === settings.takes - 1)
      .map((_row, index) => index);
  }
}

export class Game {
  public deck: Card[];
  public players: Player[];
  public table: Table;

  constructor(players: Player[]) {
    this.players = players;
    this.deck = this.createDeck();
    this.table = new Table();
  }

  public start() {
    this.distributeCards();

    for (let i = 0; i < settings.maxHand; i++) {
      console.log(`=== Round ${i + 1} ===`);
      console.log(this.table.rows.map((row) => row.map((card) => card.value)));
      this.players
        .map((player) => ({
          card: player.chooseCard(this.table),
          player: player,
        }))
        .sort(
          (decisionA, decisionB) => decisionA.card.value - decisionB.card.value
        )
        .forEach((decision) => {
          const player = decision.player;
          const rowIndex = this.table.predictRowIndex(decision.card.value);

          if (rowIndex >= 0) {
            this.table.rows[rowIndex].push(decision.card);

            if (this.table.rows[rowIndex].length >= settings.takes) {
              console.log(
                `Player ${
                  decision.player.name
                } picks up row ${rowIndex} for ${this.table.rows[
                  rowIndex
                ].reduce((count, card) => count + card.points, 0)} points`
              );
              player.graveyard = player.graveyard.concat(
                this.table.rows[rowIndex].splice(
                  0,
                  this.table.rows[rowIndex].length - 1
                )
              );
            }
          } else {
            const cry = this.table.getCheapestRowIndex();
            this.table.rows[cry].push(decision.card);
            player.graveyard = player.graveyard.concat(
              this.table.rows[cry].splice(0, this.table.rows[cry].length - 1)
            );
            console.log(`Player ${decision.player.name} cries.`);
          }
        });
    }

    return this.determineWinner();
  }

  private determineWinner(): Player {
    const results = this.players.map((player) =>
      player.graveyard.reduce((points, card) => points + card.points, 0)
    );
    const min = Math.min.apply(null, results);
    return this.players[results.indexOf(min)];
  }

  private createDeck() {
    const deck = [];

    for (let i = 1; i < settings.maxCards + 1; i++) {
      let points = 1;

      if (i % 5 === 0) {
        points = 2;
      }
      if (i % 10 === 0) {
        points = 3;
      }
      if (i % 11 === 0) {
        points = 5;
      }
      if (i === 55) {
        points = 7;
      }

      deck.push(new Card(i, points));
    }

    return deck;
  }

  private distributeCards() {
    shuffle(this.deck);

    this.players.forEach((player) => {
      player.hand = this.deck.splice(0, 10);
    });

    for (let i = 0; i < settings.rows; i++) {
      this.table.rows[i] = [this.deck.splice(0, 1)[0]];
    }
  }
}

export class Player {
  private _id: string;
  hand: Card[] = [];
  name: string;
  type: PlayerType;
  graveyard: Card[] = [];

  constructor(name = "") {
    this._id = nanoid();
    this.name = name;
    this.type = PlayerType.AI;
  }

  public get id() {
    return this._id;
  }

  public chooseCard(table?: Table): Card {
    let bestGuess: number = -1;

    if (table) {
      // Check for sure/adjacent card on safe row
      table.rows.forEach((row) => {
        if (row.length >= settings.takes - 1) {
          return;
        }
        this.hand.forEach((card, index) => {
          if (row[row.length - 1].value === card.value - 1) {
            bestGuess = index;
            console.log("found adjacent card");
          }
        });
      });

      // Try to play random card in a safe row
      if (bestGuess === -1) {
        const nogoRows = table.getDangerousRowIndices();
        const saferCards = this.hand.filter((card) => {
          const predictedRow = table.predictRowIndex(card.value);
          return nogoRows.indexOf(predictedRow) < 0;
        });

        bestGuess = Math.floor(Math.random() * (saferCards.length - 1));
      }
    }

    // Everything failed, you'll likely have to pick up
    if (bestGuess === -1) {
      bestGuess = Math.floor(Math.random() * (this.hand.length - 1));
    }

    const choice = this.hand.splice(bestGuess, 1)[0];
    console.log(
      `Player ${this.name} chose ${choice.value} with hand ${this.hand
        .map((card) => card.value)
        .sort((a, b) => a - b)}`
    );
    return choice;
  }
}

export class Card {
  value: number;
  points: number;

  constructor(value: number, points: number) {
    this.value = value;
    this.points = points;
  }
}

export function shuffle(array: Array<any>) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
