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

export class Game {
  public deck: Card[];
  public players: Player[];
  public table: Card[][];

  constructor(players: Player[]) {
    this.players = players;
    this.deck = this.createDeck();
    this.table = [];
  }

  public start() {
    this.distributeCards();

    for (let i = 0; i < settings.maxHand; i++) {
      console.log(`Round ${i + 1}`);
      console.log(this.table.map((row) => row.map((card) => card.value)));
      this.players
        .map((player) => ({
          card: player.chooseCard(this.table),
          player: player,
        }))
        .sort(
          (decisionA, decisionB) => decisionA.card.value - decisionB.card.value
        )
        .map((decision) => {
          console.log(`${decision.player.name}: ${decision.card.value}`);
          return decision;
        })
        .forEach((decision) => {
          const player = decision.player;

          const [, rowIndex] = this.getHeadCards().find(
            ([cardValue]) => decision.card.value > cardValue
          ) || [null, null];

          if (rowIndex !== null) {
            this.table[rowIndex].push(decision.card);

            if (this.table[rowIndex].length >= settings.takes) {
              player.graveyard = player.graveyard.concat(
                this.table[rowIndex].splice(0, this.table[rowIndex].length - 1)
              );
            }
          } else {
            const cry = this.getCheapestRowIndex();
            this.table[cry].push(decision.card);
            player.graveyard = player.graveyard.concat(
              this.table[cry].splice(0, this.table[cry].length - 1)
            );
            console.log(`Player ${decision.player.name} cries.`);
          }
        });
    }

    return this.determineWinner();
  }

  private getHeadCards(): [number, number][] {
    return this.table
      .reduce((head, row: Card[], index: number) => {
        head.push([row[row.length - 1].value, index]);
        return head;
      }, [] as Array<[number, number]>)
      .sort((a, b) => b[0] - a[0]);
  }

  private determineWinner(): Player {
    const results = this.players.map((player) =>
      player.graveyard.reduce((points, card) => points + card.points, 0)
    );
    const min = Math.min.apply(null, results);
    return this.players[results.indexOf(min)];
  }

  private getCheapestRowIndex(): number {
    const pointsPerRow = this.table.map((row) => {
      return row.reduce((score, card) => score + card.points, 0);
    });
    const min = Math.min.apply(null, pointsPerRow);
    return pointsPerRow.indexOf(min);
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
      this.table[i] = [this.deck.splice(0, 1)[0]];
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

  public chooseCard(table?: Card[][]): Card {
    let bestGuess: number = -1;

    if (table) {
      // Check for sure card
      table.forEach((row) => {
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

      // Try to skip row if it's full
    }

    if (bestGuess < 0) {
      bestGuess = Math.floor(Math.random() * (this.hand.length - 1));
    }

    return this.hand.splice(bestGuess, 1)[0];
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
