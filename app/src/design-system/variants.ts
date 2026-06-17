export const parallelUniverseVariants = {
  button: {
    primitive: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    product: ['gold', 'generation', 'void'],
    usage: {
      gold: 'Primary commercial action: start reading, upgrade, confirm canon.',
      generation: 'High-energy creation action: generate opening, continue assistant.',
      void: 'Destructive or irreversible action.',
    },
  },
  badge: {
    primitive: ['default', 'secondary', 'destructive', 'outline'],
    product: ['gold', 'signal', 'branch', 'stasis', 'flux', 'collapse', 'tierFree', 'tierObserver', 'tierIntervener', 'tierCreator'],
    usage: {
      stasis: 'Confirmed, stable, saved, passed.',
      flux: 'Needs attention, pending, changing.',
      collapse: 'High tension, risk, failed, dangerous.',
    },
  },
  card: {
    primitive: ['default', 'glass'],
    product: ['generation', 'branch', 'gold', 'panel', 'paper', 'book', 'reader', 'studio'],
    usage: {
      panel: 'Dark product surface for book, status, creator and studio UI.',
      paper: 'Reader manuscript surface only.',
      book: 'Book discovery cards and ranking rows.',
      reader: 'Long-form reading surface.',
      studio: 'Creator and operations work surfaces.',
    },
  },
} as const

export type ParallelUniverseVariantRegistry = typeof parallelUniverseVariants
