# Design System and UI Guidance

## 1. Design direction

The current product direction emphasizes a dark, operational dashboard aesthetic suitable for lab control rooms and admin workstations. It favors compact information density, status color coding, and strong hierarchy rather than a consumer app style.

## 2. Visual language

### Core palette

- background: `#0a0a0c`
- panel: `#141417`
- panel-alt: `#1b1729`
- primary accent: `#7c6cf6`
- primary soft: `#9b7bff`
- text primary: `#f2f2f4`
- text secondary: `#9a9aa3`
- text muted: `#62626b`
- success: `#7fe3b0`
- warning: `#f2c879`
- danger: `#ff8b8b`

### Typography
- modern sans or condensed UI styling
- uppercase mono-like labels for metadata and navigation rails
- bold, compact headings for dashboard cards
- strong spacing and small labels for status metadata

## 3. Layout system

The interface is organized into a fixed navigation sidebar and a content workspace.

### Layout structure
- left sidebar for module navigation
- top bar for contextual title and user actions
- main content grid with cards and summaries
- modal overlays for creating new equipment records

## 4. Interaction patterns

### Navigation
- sidebar sections grouped as Manage, Operate, and System
- active menu items use stronger borders and accent coloration
- mobile layout collapses to slide-over navigation

### Status states
- approved: green/calm tone
- overdue: red tone
- pending: neutral purple tone
- maintenance: golden warning tone

### Cards
- cards use border and subtle elevation instead of heavy shadows
- compact labels and summary numbers keep the dashboard dense but readable

## 5. Components in use

- main dashboard summary cards
- equipment listing cards
- request list rows
- transaction ledger rows
- maintenance overview cards
- calendar mini-grid
- modal dialogs for creation flows

## 6. Accessibility considerations

- maintain text contrast between backgrounds and foregrounds
- preserve focus rings on interactive controls
- avoid relying on color alone to indicate status
- keep labels visible next to major actions and state elements

## 7. Future design improvements

- add a lighter admin mode for daytime or print-friendly outputs
- define a full component library for consistency across screens
- create reusable form patterns for equipment and user records
- standardize empty, loading, and error states

## 8. Design goals

The design should support fast operational use by lab administrators. The interface should feel professional, calm, and highly structured rather than decorative.

This is a functional dashboard first, but it should still feel premium enough for academic or institutional use.
