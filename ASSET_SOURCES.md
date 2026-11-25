# Asset and data sources

## Destination explorer

### India map geometry

`assets/india-states-uts.svg` is a locally adapted derivative of *Political map of India EN.svg* from Wikimedia Commons, created by Saravask and improved by Wikimedia Commons contributors, licensed [Creative Commons Attribution-ShareAlike 3.0 Unported (CC BY-SA 3.0)](https://creativecommons.org/licenses/by-sa/3.0/legalcode). Source page: https://commons.wikimedia.org/wiki/File:Political_map_of_India_EN.svg.

Local adaptation: label, legend, grid, scale, the embedded stylesheet and other non-geographic layers were removed, including every water, country and subdivision label. The Jammu & Kashmir and Ladakh `<use>` references were resolved into real paths using their original path data, while every other geographic path `d` was preserved byte-for-byte. Region groups were annotated with canonical identifiers and keyboard interaction attributes, and non-interactive geometry is recoloured with the site palette in CSS. This is an illustrative boundary map for discovery only, not an official or legal record of disputed boundaries. The derivative is distributed under CC BY-SA 3.0.

### Destination data

`assets/destination-data.js` contains locally stored, curated data checked on 2026-11-25:

- **India:** 216 destination entries across all 28 states and 8 union territories, with names, concise descriptions and categories checked against the official [Incredible India](https://www.incredibleindia.gov.in/) state/UT pages of the Ministry of Tourism, Government of India. Each entry links to the relevant official page as its source.
- **Countries:** exactly 195 sovereign countries — 193 [UN member states](https://www.un.org/en/about-us/member-states) plus the Holy See and the State of Palestine as non-member observer states — with ISO alpha-2 codes from the [mledoze countries dataset](https://mledoze.github.io/countries/).
- **International guides:** 40 verified destinations across 10 priority countries (United Arab Emirates, Saudi Arabia, Qatar, Kuwait, Malaysia, Singapore, Maldives, Thailand, Sri Lanka and Türkiye), sourced from official tourism boards, official attraction sites, UNESCO World Heritage/Tentative List/MAB pages, and reputable destination guides. All other countries deliberately show `Destination guide coming soon`; the interface states that coverage is selective and not exhaustive.

### Country flags

Flags are Unicode regional-indicator emoji derived from each country's ISO alpha-2 code. No flag API or external image host is used. Country buttons always show the full country name and ISO code as well as the flag, so identity remains readable when a platform does not render flag glyphs.

---

# Service card image sources

The 11 service-card images are stored locally in `assets/` and served same-origin. The URLs below document provenance only; the site does not request these remote URLs at runtime.

All source images are from Pexels and are covered by the [Pexels License](https://www.pexels.com/license/): free to use, attribution not required, and modification allowed. Credit is included here voluntarily.

Each downloaded image was centre-cropped to 1600 × 1000, resized, and exported as WebP (quality 82) for consistent card proportions and smaller payloads. The Tourist Visa Processing, Passport Services, Certificate Attestation Service and Emigration Clearance Services images were subsequently replaced with the more purpose-specific sources listed below; the other seven assets were left byte-identical.

| Service | Local asset | Source page | Photographer | Source image URL |
| --- | --- | --- | --- | --- |
| Flight Ticket Booking | `assets/service-flight.webp` | [Commercial Jet Airplane at Airport Runway](https://www.pexels.com/photo/30773901/) | Drinu Cutajar | `https://images.pexels.com/photos/30773901/pexels-photo-30773901.jpeg?auto=compress&cs=tinysrgb&w=1800` |
| Tourist Visa Processing | `assets/service-tourist-visa.webp` | [US Passport and Visa Documents Arrangement](https://www.pexels.com/photo/39356225/) | 2DΛVΞ GΛRCIΛ | `https://images.pexels.com/photos/39356225/pexels-photo-39356225.jpeg?auto=compress&cs=tinysrgb&w=1800` |
| Tour Package | `assets/service-tour-package.webp` | [A Beach and Mountain](https://www.pexels.com/photo/5231935/) | Jess Loiterton | `https://images.pexels.com/photos/5231935/pexels-photo-5231935.jpeg?auto=compress&cs=tinysrgb&w=1800` |
| Umrah & Hajj Services | `assets/service-umrah-hajj.webp` | [Pilgrims at the Kaaba in Mecca during Hajj](https://www.pexels.com/photo/32290182/) | Yasir Gürbüz | `https://images.pexels.com/photos/32290182/pexels-photo-32290182.jpeg?auto=compress&cs=tinysrgb&w=1800` |
| Passport Services | `assets/service-passport.webp` | [Close-up of Passports](https://www.pexels.com/photo/8061986/) | Borys Zaitsev | `https://images.pexels.com/photos/8061986/pexels-photo-8061986.jpeg?auto=compress&cs=tinysrgb&w=1800` |
| Certificate Attestation Service | `assets/service-certificate.webp` | [Diploma and Notebook on a Desk](https://www.pexels.com/photo/8112202/) | Pavel Danilyuk | `https://images.pexels.com/photos/8112202/pexels-photo-8112202.jpeg?auto=compress&cs=tinysrgb&w=1800` |
| Hotel Booking | `assets/service-hotel-booking.webp` | [Luxurious Hotel Room with Elegant Decor and Ambiance](https://www.pexels.com/photo/34645081/) | Moussa Idrissi | `https://images.pexels.com/photos/34645081/pexels-photo-34645081.jpeg?auto=compress&cs=tinysrgb&w=1800` |
| Emigration Clearance Services | `assets/service-emigration.webp` | [Holding Indonesian Passport at Yogyakarta Airport](https://www.pexels.com/photo/39075595/) | Yazid N | `https://images.pexels.com/photos/39075595/pexels-photo-39075595.jpeg?auto=compress&cs=tinysrgb&w=1800` |
| Cab Services | `assets/service-cab.webp` | [Focused taxi driver at cab on street](https://www.pexels.com/photo/5834961/) | Tim Samuel | `https://images.pexels.com/photos/5834961/pexels-photo-5834961.jpeg?auto=compress&cs=tinysrgb&w=1800` |
| Bus Ticket Booking | `assets/service-bus.webp` | [Vibrant Tourist Bus on Scenic Highway](https://www.pexels.com/photo/31310051/) | Santiago Quiñonez Meza | `https://images.pexels.com/photos/31310051/pexels-photo-31310051.jpeg?auto=compress&cs=tinysrgb&w=1800` |
| Train Ticket Booking | `assets/service-train.webp` | [Passenger Train at the Platform with a Colonnade](https://www.pexels.com/photo/19790143/) | Kevin Yang | `https://images.pexels.com/photos/19790143/pexels-photo-19790143.jpeg?auto=compress&cs=tinysrgb&w=1800` |
