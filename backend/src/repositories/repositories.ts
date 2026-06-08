import { InMemoryRepository } from "./InMemoryRepository.js";
import type {
  User,
  Account,
  Event,
  AuctionOpportunity,
  BankOffer
} from "../models/types.js";

export const userRepository = new InMemoryRepository<User>();
export const accountRepository = new InMemoryRepository<Account>();
export const eventRepository = new InMemoryRepository<Event>();
export const auctionRepository = new InMemoryRepository<AuctionOpportunity>();
export const bankOfferRepository = new InMemoryRepository<BankOffer>();