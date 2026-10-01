/**
 * Table relations for Drizzle's relational query API (`db.query.*`).
 * ------------------------------------------------------------------
 * They don't change the database – they only tell Drizzle how tables are
 * linked so we can load nested data in one call, e.g.
 *
 *   db.query.providers.findFirst({
 *     where: eq(providers.slug, slug),
 *     with: { city: true, locations: true, conditions: { with: { condition: true } } },
 *   })
 *
 * Many-to-many links go through their join table, so provider conditions
 * come back as [{ providerId, conditionId, condition: {…} }]. Use the
 * `pluck()` helper in src/lib/db.ts to flatten them.
 */
import { relations } from "drizzle-orm";
import * as t from "./schema";

export const usersRelations = relations(t.users, ({ one, many }) => ({
  provider: one(t.providers, { fields: [t.users.providerId], references: [t.providers.id] }),
  media: many(t.media),
}));

export const providersRelations = relations(t.providers, ({ one, many }) => ({
  plan: one(t.plans, { fields: [t.providers.planId], references: [t.plans.id] }),
  city: one(t.cities, { fields: [t.providers.cityId], references: [t.cities.id] }),
  user: one(t.users, { fields: [t.providers.id], references: [t.users.providerId] }),
  conditions: many(t.providerConditions),
  specialties: many(t.providerSpecialties),
  insurances: many(t.providerInsurances),
  locations: many(t.providerLocations),
  gallery: many(t.galleryImages),
  videos: many(t.providerVideos),
  faqs: many(t.providerFaqs),
  reviews: many(t.reviews),
  appointments: many(t.appointmentRequests),
  messages: many(t.providerMessages),
  events: many(t.analyticsEvents),
  planOrders: many(t.planOrders),
  media: many(t.media),
}));

export const providerLocationsRelations = relations(t.providerLocations, ({ one }) => ({
  provider: one(t.providers, { fields: [t.providerLocations.providerId], references: [t.providers.id] }),
  city: one(t.cities, { fields: [t.providerLocations.cityId], references: [t.cities.id] }),
}));

export const galleryImagesRelations = relations(t.galleryImages, ({ one }) => ({
  provider: one(t.providers, { fields: [t.galleryImages.providerId], references: [t.providers.id] }),
}));

export const providerVideosRelations = relations(t.providerVideos, ({ one }) => ({
  provider: one(t.providers, { fields: [t.providerVideos.providerId], references: [t.providers.id] }),
}));

export const providerFaqsRelations = relations(t.providerFaqs, ({ one }) => ({
  provider: one(t.providers, { fields: [t.providerFaqs.providerId], references: [t.providers.id] }),
}));

export const reviewsRelations = relations(t.reviews, ({ one }) => ({
  provider: one(t.providers, { fields: [t.reviews.providerId], references: [t.providers.id] }),
}));

export const appointmentRequestsRelations = relations(t.appointmentRequests, ({ one }) => ({
  provider: one(t.providers, { fields: [t.appointmentRequests.providerId], references: [t.providers.id] }),
}));

export const providerMessagesRelations = relations(t.providerMessages, ({ one }) => ({
  provider: one(t.providers, { fields: [t.providerMessages.providerId], references: [t.providers.id] }),
}));

export const plansRelations = relations(t.plans, ({ many }) => ({
  providers: many(t.providers),
  orders: many(t.planOrders),
}));

export const planOrdersRelations = relations(t.planOrders, ({ one }) => ({
  provider: one(t.providers, { fields: [t.planOrders.providerId], references: [t.providers.id] }),
  plan: one(t.plans, { fields: [t.planOrders.planId], references: [t.plans.id] }),
}));

export const citiesRelations = relations(t.cities, ({ many }) => ({
  providers: many(t.providers),
  locations: many(t.providerLocations),
}));

export const conditionsRelations = relations(t.conditions, ({ many }) => ({
  providers: many(t.providerConditions),
  popularSearches: many(t.popularSearches),
}));

export const specialtiesRelations = relations(t.specialties, ({ many }) => ({
  providers: many(t.providerSpecialties),
  popularSearches: many(t.popularSearches),
}));

export const insurancesRelations = relations(t.insurances, ({ many }) => ({
  providers: many(t.providerInsurances),
}));

// Join tables: each row points to one provider and one taxonomy item
export const providerConditionsRelations = relations(t.providerConditions, ({ one }) => ({
  provider: one(t.providers, { fields: [t.providerConditions.providerId], references: [t.providers.id] }),
  condition: one(t.conditions, { fields: [t.providerConditions.conditionId], references: [t.conditions.id] }),
}));

export const providerSpecialtiesRelations = relations(t.providerSpecialties, ({ one }) => ({
  provider: one(t.providers, { fields: [t.providerSpecialties.providerId], references: [t.providers.id] }),
  specialty: one(t.specialties, { fields: [t.providerSpecialties.specialtyId], references: [t.specialties.id] }),
}));

export const providerInsurancesRelations = relations(t.providerInsurances, ({ one }) => ({
  provider: one(t.providers, { fields: [t.providerInsurances.providerId], references: [t.providers.id] }),
  insurance: one(t.insurances, { fields: [t.providerInsurances.insuranceId], references: [t.insurances.id] }),
}));

export const popularSearchesRelations = relations(t.popularSearches, ({ one }) => ({
  condition: one(t.conditions, { fields: [t.popularSearches.conditionId], references: [t.conditions.id] }),
  specialty: one(t.specialties, { fields: [t.popularSearches.specialtyId], references: [t.specialties.id] }),
}));

export const blogCategoriesRelations = relations(t.blogCategories, ({ many }) => ({
  posts: many(t.blogPosts),
}));

export const blogTagsRelations = relations(t.blogTags, ({ many }) => ({
  posts: many(t.blogPostTags),
}));

export const blogPostsRelations = relations(t.blogPosts, ({ one, many }) => ({
  category: one(t.blogCategories, { fields: [t.blogPosts.categoryId], references: [t.blogCategories.id] }),
  tags: many(t.blogPostTags),
  comments: many(t.blogComments),
  ratings: many(t.blogRatings),
}));

export const blogPostTagsRelations = relations(t.blogPostTags, ({ one }) => ({
  post: one(t.blogPosts, { fields: [t.blogPostTags.postId], references: [t.blogPosts.id] }),
  tag: one(t.blogTags, { fields: [t.blogPostTags.tagId], references: [t.blogTags.id] }),
}));

export const blogCommentsRelations = relations(t.blogComments, ({ one }) => ({
  post: one(t.blogPosts, { fields: [t.blogComments.postId], references: [t.blogPosts.id] }),
}));

export const blogRatingsRelations = relations(t.blogRatings, ({ one }) => ({
  post: one(t.blogPosts, { fields: [t.blogRatings.postId], references: [t.blogPosts.id] }),
}));

export const productCategoriesRelations = relations(t.productCategories, ({ many }) => ({
  products: many(t.products),
}));

export const productsRelations = relations(t.products, ({ one, many }) => ({
  category: one(t.productCategories, { fields: [t.products.categoryId], references: [t.productCategories.id] }),
  orderItems: many(t.orderItems),
}));

export const ordersRelations = relations(t.orders, ({ many }) => ({
  items: many(t.orderItems),
}));

export const orderItemsRelations = relations(t.orderItems, ({ one }) => ({
  order: one(t.orders, { fields: [t.orderItems.orderId], references: [t.orders.id] }),
  product: one(t.products, { fields: [t.orderItems.productId], references: [t.products.id] }),
}));

export const visitorsRelations = relations(t.visitors, ({ many }) => ({
  events: many(t.analyticsEvents),
}));

export const analyticsEventsRelations = relations(t.analyticsEvents, ({ one }) => ({
  visitor: one(t.visitors, { fields: [t.analyticsEvents.visitorId], references: [t.visitors.id] }),
  provider: one(t.providers, { fields: [t.analyticsEvents.providerId], references: [t.providers.id] }),
}));

export const mediaRelations = relations(t.media, ({ one }) => ({
  uploadedBy: one(t.users, { fields: [t.media.uploadedById], references: [t.users.id] }),
  provider: one(t.providers, { fields: [t.media.providerId], references: [t.providers.id] }),
}));
