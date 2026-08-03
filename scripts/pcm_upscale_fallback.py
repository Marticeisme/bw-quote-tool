# -*- coding: utf-8 -*-
"""
The PCM design plates where Real-ESRGAN got it WRONG, and why.

Read by scripts/pcm_upscale.py. Every plate named here is encoded from the lossless
347px export by plain Lanczos enlargement instead — no AI, nothing invented — and is
recorded in data/pcm-upscale-manifest.json with `"method": "resample"`.
scripts/verify_pcm_upscale.mjs asserts the split matches this list exactly, so a plate
cannot quietly move between the two paths.

WHY A LIST AND NOT A THRESHOLD. Both defect classes were found by looking at all 699
plates, in ranked contact-sheet batches, at the zoom a counselor's lightbox shows. The
metrics only ordered the queue; the eye decided. A metric good enough to gate on would
have to be re-validated by eye anyway, so the eye's verdict is what is written down.

TWO REASONS, both operator-facing:

  'text'    Sub-6px lettering came back sharp but WRONG — 'e' filling into 'a', 'i'
            into 'l'. Confidently wrong beats blurry-but-right in most images; in a
            memorial catalog it does not. A family reading "Balovad Wlfa" on a sample
            epitaph sees a broken product.
  'granite' A fine salt-and-pepper granite was re-imagined as a cloudy, crazed slab.
            Colour survives, grain character does not — and grain is something the
            family is choosing.

Keys are (book, num) as strings, matching pcm-design-images/<book>/<num>.webp.
"""

FALLBACK = {
    # ---- 2020 book -------------------------------------------------------------------
    ('2020', '838'): 'text: the inventor paragraph reads "Tione to reflect", "dnnaming", '
                     '"Iinkering"',
    ('2020', '841'): 'text: the historical-site plaque reads "THAT HA/E BEEN NARKED"',
    ('2020', '918'): 'text: "as God calls us onr by onr, the chain will llnk again"',
    ('2020', '958'): 'text: "EDWARD WAS PROUD OF NEUER HAVING", "RESPECTED DFFICER"',
    ('2020', '1004'): 'text: the whole four-line dedication block is illegible mush',
    ('2020', '1006'): 'text: "mARRIED JUNE 23, 1965"; the ceramic portrait faces are also '
                      'redrawn',
    ('2020', '1008'): 'text: "A wonderful son and brother whoso love for the outdoors"',
    ('2020', '1011'): 'text: "Beloved Wife, Mother and Sistor" — the plate that started this',
    ('2020', '1017'): 'text: "You Will Novos Be Forgotton / For Though We Aro Apart"',
    ('2020', '1018'): 'text: "Forever portnors on the trails", "as you always wene before"',
    ('2020', '987'): 'granite: fine salt-and-pepper grey rebuilt as a smooth crazed marble '
                     '— a different stone, not a sharper one',
    ('2020', '992'): 'granite: the speckle over the Celtic knotwork flattens into blotches',
    # ---- 2011 book -------------------------------------------------------------------
    ('2011', '2108'): 'text: "Togethen Foreuel In Chnist" and both date blocks',
    ('2011', '2142'): 'text: stray marks invented over "Nov. 1," and "Dec. 25,"',
    ('2011', '2194'): 'text: both date lines dissolve — "Immmy 20, 1930" for "January 26, '
                      '1936"',
    ('2011', '2209'): 'text: comma-shaped artifacts inserted into both "Aug. 11, 1938 ~ '
                      'Sept. 19, 2008" lines',
    ('2011', '2251'): 'text: "Marrird March c, 1990", and SEPT. 19, 2008 -> 2009 — a DIGIT '
                      'changed',
    ('2011', '2268'): 'text: Dec. 28, 1936 -> Dec. 26, 1936 — a DIGIT changed',
    ('2011', '2274'): 'text: "SING AND MAKE MUSIC A YOUR HEART" for "IN YOUR HEART", and '
                      '"ALWAYS OVING THANKS" for "GIVING" — whole words substituted',
    ('2011', '2362'): 'text: the 1951-2010 en-dash becomes a dotted run; "Beloved Husband" '
                      'ghosts',
    ('2011', '2456'): 'text: "LOVE IS A GARDEN / TEND IT, MEND IT" comes back as '
                      '"GaBDHn / TIInD H. MInD IT"',
    ('2011', '2457'): 'text: "BROUGHT TOGETHER BY THE LIGHT OF LOVE" -> "LIGHT OF LOVL"',
}

# CHECKED AND LEFT ON THE AI PATH. Each of these was flagged in the full pass and then
# pulled up beside its fallback at 700px, where the AI turned out to be correct AND
# sharper. Recorded so the next person does not re-flag them from the sheets alone:
#   2020/668, 741, 807, 825, 864, 871, 920
#   2011/2109, 2110, 2205, 2207, 2252, 2260, 2327, 2430, 2450
# 2011/2430 is the closest call — "For Time and All Eternity" is rougher under the AI but
# every letter is the right letter, which is the line this list is drawn on.
