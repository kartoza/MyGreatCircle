# Changelog

All notable changes to MyGreatCircle are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-06-29

### Added
- **GIF export options** in the Animated GIF card on the Output screen:
  - **Size**: 480×270, 800×450 (default), 1280×720, or 1920×1080 (all 16:9 to match the geoEqualEarth projection).
  - **Labels**: None, Place name, Date, or Name & date. The current head's label is drawn as a word-wrapped chip in the bottom-left corner, styled to match the Kartoza branding chip in the bottom-right.
  - **Trail**: Persistent (full journey) or fixed-length window of the last 1, 2, 3, or 5 arcs behind the head. Older arcs are hidden as the head advances.
- Gelato mockup API integration with a restructured, category-filtered product browsing export modal.

### Changed
- Backend dev port moved from 8080 → 18080 (override via `make dev PORT=…`); Vite proxy updated to match. Production default (`./mygreatcircle`) remains 8080.
- Nix flake `vendorHash` now pins Go module deps via the module proxy instead of relying on an absent `vendor/` directory, restoring `nix build` and `nix run .#mygreatcircle`.

### Fixed
- Build hygiene: resolved outstanding `errcheck` and `staticcheck` lint issues.
