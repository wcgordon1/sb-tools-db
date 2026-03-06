import { defineCollection, z } from "astro:content";

const work = defineCollection({
  schema: ({ image }) =>
    z.object({
      work: z.string(),
      live: z.string(),
      title: z.string(),
      description: z.string(),
      intro: z
        .array(
          z.object({
            paragraphs: z.array(z.string()).optional(),
          }),
        )
        .optional(),
      outro: z
        .array(
          z.object({
            paragraphs: z.array(z.string()).optional(),
          }),
        )
        .optional(),
      highlights: z
        .array(
          z.object({
            title: z.string().optional(),
            paragraphs: z.array(z.string()).optional(),
          }),
        )
        .optional(),
      projectData: z
        .array(
          z.object({
            client: z.string(),
            service: z.string(),
            sector: z.string(),
            year: z.string(),
          }),
        )
        .optional(),
      credits: z
        .array(
          z.object({
            name: z.string(),
            role: z.string(),
          }),
        )
        .optional(),
      images: z.array(
        z.object({
          url: image(),
          alt: z.string(),
        }),
      ),
      thumbnail: z.object({
        url: image(),
        alt: z.string(),
      }),
    }),
});

const store = defineCollection({
  schema: ({ image }) =>
    z.object({
      price: z.string(),
      title: z.string(),
      checkout: z.string(),
      license: z.string(),
      highlights: z.array(z.string()),
      specifications: z
        .array(
          z.object({
            name: z.string(),
            value: z.string(),
          }),
        )
        .optional(),
      description: z.string(),
      image: z.object({
        url: image(),
        alt: z.string(),
      }),
      images: z.array(
        z.object({
          url: image(),
          alt: z.string(),
        }),
      ),
      faq: z
        .array(
          z.object({
            question: z.string(),
            answer: z.string(),
          }),
        )
        .optional(),
    }),
});

const posts = defineCollection({
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      pubDate: z.date(),
      description: z.string(),
      author: z.string(),
      image: z.object({
        url: image(),
        alt: z.string(),
      }),
      tags: z.array(z.string()),
    }),
});

export const collections = {
  work,
  store,
  posts,
};
