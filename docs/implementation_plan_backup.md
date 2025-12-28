# Implementation Plan: "What's poppin'?" (Restored)

**POC: Braunschweig** | Event-Discovery mit animierten Bubbles

---

## Übersicht

| Komponente | Technologie | Status |
|------------|-------------|--------|
| Backend | Firebase Cloud Functions (Python 2nd Gen) | **Fertig (POC)** |
| Datenbank | Cloud Firestore | **Fertig (POC)** |
| KI-Service | Gemini API mit Search Grounding | **Fertig (POC)** |
| Frontend | Expo (React Native) + TypeScript | **In Arbeit** |
| **SDK-Strategie**| **Standard Firebase JS SDK** (Web+Mobile identisch) | |
| **View-Modi** | **Dual View** (Map + Bubbles switchable) | |
| **Design** | **Neon Nights** (Dark Mode) & **Clean Pastel** (Light Mode) | |
| **Dev-Modus** | **Mock-First** (UI gegen Mock-Daten entwickeln) | |

| **POC-Fokus** | **Nur Braunschweig (Hardcoded/Config)** | **Aktiv** |

---

## Firestore-Schema

```
/events/{eventId}
├── title, description, category, startTime, endTime?
├── location: GeoPoint, address, city
├── sourceUrl, createdAt, fetchedAt, hash

/cities/{cityId}
├── name: string              # "Braunschweig"
├── location: GeoPoint        # Stadtzentrum
├── radiusKm: number          # Suchradius
├── population: number        # Für Snapping-Score
├── geonameId: number         # GeoNames-Referenz
├── lastFetchedAt: timestamp
└── status: string            # "active" | "pending" | "disabled"
```

---

## City-Discovery (Inkrementell)

> [!IMPORTANT]
> Städte werden **on-demand** beim ersten Request aus der Region hinzugefügt.

### Ablauf bei neuer Anfrage

1. **Bekannte Städte suchen** (Firestore `/cities`).
2. **Gefunden?** Snapping + Events zurückgeben.
3. **Keine Stadt?** GeoNames API abfragen (`findNearbyPlaceNameJSON`).
4. **Neue Stadt anlegen** in `/cities` mit `status="pending"`.
5. **Gemini Trigger:** Events holen & Stadt aktivieren.

### GeoNames-Integration

- **API:** `http://api.geonames.org/findNearbyPlaceNameJSON`
- **Filter:** `cities15000` (Städte > 15k Einwohner)

---

## Cloud Functions (Python 2nd Gen)

| Funktion | Trigger |
|----------|---------|
| `get_events` | HTTPS GET | API mit Discovery + Snapping |
| `fetch_events_for_city` | Pub/Sub | Gemini-Query pro Stadt |
| `scheduled_trigger` | Scheduler | Pro Stadt, 6h versetzt |
| `cleanup_old_events` | Scheduler | Täglich |

---

## Entscheidungen (Status Quo)

- **Sprache:** Python (für Backend Cloud Functions).
- **POC-Stadt:** ✅ Braunschweig.
- **City-Discovery:** Inkrementell aktiv.
- **Intervall:** 6h.
