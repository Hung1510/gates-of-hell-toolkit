export function AboutPage() {
  return (
    <div className="about-page">
      <section>
        <h3>What this is</h3>
        <p>
          A free, community-built toolkit for <em>Call to Arms: Gates of Hell</em>. Not
          affiliated with or endorsed by Digitalmindsoft or the game's publishers - built
          by a player, for players and modders.
        </p>
      </section>

      <section>
        <h3>Where the data comes from</h3>
        <p>
          Everything shown here is parsed directly from the game's own files (the
          <code>.set</code> config format inside <code>gamelogic.pak</code>, and the
          gettext <code>.pot</code> localization files inside <code>default.pak</code>),
          not hand-entered or guessed. The parser and every data source were verified
          against real extracted game files before being trusted:
        </p>
        <ul>
          <li>All 1061 squads and 1041 tech nodes across all 5 factions round-trip
            through the parser and serializer with zero data loss.</li>
          <li>Display names come from the game's own localization files. Individual
            soldier names are ~95-100% covered; squad names are genuinely partial
            (~25-35%) because some conquest-specific squad variants simply don't have
            their own localization entry in the base game - not a bug here, a gap in
            the source data. Falls back to the internal id when no name exists.</li>
        </ul>
      </section>

      <section>
        <h3>What's NOT here (yet)</h3>
        <ul>
          <li><strong>Vehicle gun penetration</strong> - infantry weapon damage/fire-rate
            is now resolved for ~62% of soldiers (the rest are mostly support roles
            without a combat weapon), but vehicle guns use a more complex system
            (multiple ammo types per gun, weapons that inherit stats from other weapon
            files) that isn't resolved yet.</li>
          <li><strong>Full localization for all languages</strong> - only English source
            text is used (the game's own gettext files ship with the English strings
            even before translation).</li>
        </ul>
      </section>

      <section>
        <h3>DPS estimates</h3>
        <p>
          The Compare tab shows an estimated DPS using real, resolved weapon damage and
          fire-rate data (cross-checked against known real-world weapon specs - e.g. the
          resolved Mosin-Nagant velocity and MG34 fire rate both matched historical specs
          before this was trusted enough to ship). It's a simplified estimate, not a
          number the game itself shows: it assumes continuous fire with no accuracy,
          cover, suppression, or range falloff. If any unit in a squad's composition
          doesn't have a resolved weapon, DPS shows as unknown rather than a partial or
          misleading number.
        </p>
      </section>

      <section>
        <h3>Ask the Mod</h3>
        <p>
          The search on the "Ask the Mod" tab is pattern-matching over the real parsed
          data (which squads use X, what unlocks X, cost thresholds) - it is not
          embeddings-based semantic search, so it won't understand arbitrary
          paraphrasing outside those patterns.
        </p>
      </section>
    </div>
  );
}
