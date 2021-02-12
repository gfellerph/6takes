import { nanoid } from "nanoid";
import prompts from "prompts";
import EventEmitter from "events";

export enum PlayerType {
  Player,
  AI,
  Console,
}

export const settings = {
  rows: 4,
  maxHand: 10,
  maxCards: 104,
  takes: 6,
  maxScore: 66,
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

export class Game extends EventEmitter {
  players: Player[];
  roundCount = 0;

  constructor(players: Player[]) {
    super();
    this.players = players;
  }

  async start() {
    while (this.players.some((player) => !player.hasLost)) {
      const round = new Round(this.players);
      this.players = await round.start();
    }

    this.players = this.players.sort((a, b) => a.score - b.score);
    console.log("=== Game ends ===");
    console.log(
      this.players
        .map(
          (player, index) => `${index + 1}. ${player.name} (${player.score})`
        )
        .join("\n")
    );
  }
}
export class Round extends EventEmitter {
  public deck: Card[];
  public players: Player[];
  public table: Table;

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.deck = this.createDeck();
    this.table = new Table();
    this.emit("initialized", this);
  }

  public async start() {
    this.emit("starting", this);
    this.distributeCards();
    this.emit("cardsDistributed", this);

    for (let i = 0; i < settings.maxHand; i++) {
      this.emit("roundStart", i + 1);
      if (this.players.some((player) => player.type === PlayerType.Console)) {
        console.log(`=== Round ${i + 1} ===`);
        console.log(
          this.table.rows
            .map((row) => row.map((card) => card.value).join(", "))
            .join("\n")
        );
      }

      const decisions = await Promise.all(
        this.players.map(async (player) => ({
          card: await player.chooseCard(this.table),
          player: player,
        }))
      );

      this.emit("cardsChosen", decisions);

      console.log(
        decisions
          .map((decision) => `${decision.player.name}: ${decision.card.value}`)
          .join(" | ")
      );

      decisions
        .sort(
          (decisionA, decisionB) => decisionA.card.value - decisionB.card.value
        )
        .forEach((decision) => {
          const player = decision.player;
          const rowIndex = this.table.predictRowIndex(decision.card.value);

          if (rowIndex >= 0) {
            this.table.rows[rowIndex].push(decision.card);

            if (this.table.rows[rowIndex].length >= settings.takes) {
              if (
                this.players.some(
                  (player) => player.type === PlayerType.Console
                )
              ) {
                console.log(
                  `Player ${
                    decision.player.name
                  } picks up row ${rowIndex} for ${this.table.rows[
                    rowIndex
                  ].reduce((count, card) => count + card.points, 0)} points`
                );
              }
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
            if (
              this.players.some((player) => player.type === PlayerType.Console)
            ) {
              console.log(
                `Player ${
                  decision.player.name
                } picks up row ${cry} for ${this.table.rows[cry].reduce(
                  (count, card) => count + card.points,
                  0
                )} points`
              );
            }
          }
        });
    }

    this.emit("end", this);
    this.players = this.players
      .map((player) => {
        player.score += player.graveyard.reduce(
          (points, card) => points + card.points,
          0
        );
        return player;
      })
      .sort((playerA, playerB) => playerA.score - playerB.score);

    console.log("=== Round ends ===");
    console.log(
      this.players
        .sort((a, b) => a.score - b.score)
        .map(
          (player, index) => `${index + 1}. ${player.name} (${player.score})`
        )
        .join("\n")
    );
    return this.players;
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
  score: number;

  constructor(name = "", type = PlayerType.AI) {
    this._id = nanoid();
    this.name = name;
    this.type = type;
    this.score = 0;
  }

  public get id() {
    return this._id;
  }

  public get hasLost() {
    return this.score >= settings.maxScore;
  }

  public async chooseCard(table?: Table): Promise<Card> {
    let cardIndex;
    if (this.type === PlayerType.AI) {
      if (!table) {
        throw new Error(
          "Table must be passed as argument for AI to make a decision."
        );
      }
      cardIndex = this.guessCard(table);
    } else if (this.type === PlayerType.Console) {
      const answer = await prompts({
        type: "select",
        message: "Pick a card: ",
        name: "index",
        choices: this.hand
          .map((card, index) => ({
            title: `${card.value} (${card.points})`,
            value: index,
            order: card.value,
          }))
          .sort((a, b) => a.order - b.order),
      });
      cardIndex = answer.index;
    } else {
      throw new Error("Player type not supported");
    }

    return this.hand.splice(cardIndex, 1)[0];
  }

  private guessCard(table: Table): number {
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

    /* console.log(
      `Player ${this.name} chose ${
        this.hand[bestGuess].value
      } with hand ${this.hand.map((card) => card.value).sort((a, b) => a - b)}`
    ); */
    return bestGuess;
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
