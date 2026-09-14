const paths = {
  overview: ['M3 10 12 3l9 7', 'M5 9v12h5v-7h4v7h5V9'],
  reports: ['M6 3h12v18H6z', 'M9 7h6M9 11h6M9 15h3'],
  fares: ['M3 6h18v12H3z', 'M7 6v3H3M17 18v-3h4', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6'],
  'train-fares': [
    'M7 3h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z',
    'M5 10h14M12 3v7M8 14h.01M16 14h.01M8 18l-2 3M16 18l2 3',
  ],
  'route-suggestions': ['M5 5h9a5 5 0 0 1 0 10H9', 'M5 2v6M2 5h6', 'M9 12l-3 3 3 3', 'M18 21h3'],
  accounts: [
    'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    'M2 21v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3',
    'M17 4a4 4 0 0 1 0 7M19 14a4 4 0 0 1 3 4v3',
  ],
  passengers: ['M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'M2 21v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3'],
  staff: [
    'M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0',
    'M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2',
    'M12 16v5M9.5 18.5h5',
  ],
  chevron: ['m8 10 4 4 4-4'],
  gtfs: ['m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z', 'M9 3v15M15 6v15'],
  'my-account': ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4 21a8 8 0 0 1 16 0'],
  collapse: ['M14 7l-5 5 5 5'],
  expand: ['M10 7l5 5-5 5'],
  menu: ['M4 6h16M4 12h16M4 18h16'],
  close: ['m6 6 12 12M18 6 6 18'],
  logout: ['M10 4H4v16h6M10 12h11M17 8l4 4-4 4'],
}

export default function NavigationIcon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {(paths[name] || paths.menu).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
