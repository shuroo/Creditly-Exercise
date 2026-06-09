
import { MongoRepository } from "./MongoRepository.js"; 

import type {
  User,
  Account,
  Event,
  AuctionOpportunity,
  BankOffer
} from "../models/types.js";

//export const userRepository = new InMemoryRepository<User>();
//export const accountRepository = new InMemoryRepository<Account>();
//export const eventRepository = new InMemoryRepository<Event>();
//export const auctionRepository = new InMemoryRepository<AuctionOpportunity>();
//export const bankOfferRepository = new InMemoryRepository<BankOffer>();

import { connectDb } from "./db.js";

const db = await connectDb();

const userRepository = new MongoRepository<User>(
  db.collection<User>("users")
);

const accountRepository = new MongoRepository<Account>(
  db.collection<Account>("accounts")
);

const eventRepository = new MongoRepository<Event>(
  db.collection<Event>("events")
);

const auctionRepository = new MongoRepository<AuctionOpportunity>(
  db.collection<AuctionOpportunity>("auctions")
);

const bankOfferRepository = new MongoRepository<BankOffer>(
  db.collection<BankOffer>("bankOffers")
);

export {
  userRepository,
  accountRepository,   
  eventRepository,
  auctionRepository,
  bankOfferRepository
};