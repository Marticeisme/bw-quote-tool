# Terrace Garden splat cleanup — attempted, NOT shipped

Recorded so the attempt is reproducible and so nobody repeats it expecting a
different answer.

## Tool

    pip install --no-deps "git+https://github.com/francescofugazzi/3dgsconverter.git"
    pip install scikit-learn plyfile tqdm

3D Gaussian Splatting Converter **0.9.1**. `pip install 3dgsconverter` does not
exist on PyPI, and installing WITH dependencies fails on this machine: the
package requires `taichi`, which has no wheel for Python 3.14.5. Installed
`--no-deps` and supplied the rest by hand; the tool then runs its SOR on a CPU
KDTree fallback (`[SOR] Building KDTree (CPU Fallback)...`), which is fine — the
whole pass takes about a minute.

## Command

    python -m gsconverter.main \
      -i scratch/splat/TG/out/TG_30000.ply \
      -o scratch/clean/TG_sor8.ply \
      -f 3dgs --sor_intensity 8.0 --density_sensitivity 0.5 \
      --keep_multicluster --force --debug

Result: density filter kept 3 clusters and retained 1,099,229 of 1,200,000
vertices; SOR ran with K=41, sigma=6.78. The source .ply was never mutated.

**Note both filters must be asked for.** Passing `--sor_intensity` alone changed
nothing — output came back at exactly 1,200,000 points. `--density_sensitivity`
is what makes the filtering stage run at all.

## The needle prune, and the mistake worth keeping

`scripts/build_com_splat.mjs --max-aniso N` was added for this: drop gaussians
stretched into spikes, which is how the trainer represents grass and turf.

The FIRST version measured longest axis / SHORTEST axis and made the render
dramatically WORSE (`scratch/s14a-renders/TG-cleaned/`). A gaussian rendering a
flat surface is a DISC — two large axes and one near-zero — so its max/min ratio
is every bit as extreme as a needle's. The filter was deleting the splats that
were filling the ground in, leaving the spikes it was meant to remove standing
alone. At `--max-aniso 15` it removed 485,245 splats to achieve this.

The correct measure is longest / MIDDLE: a needle has one long axis and two
short ones, a disc has two long axes, so max/mid is near 1 for a disc.

    node scripts/build_com_splat.mjs scratch/clean/TG_sor8.ply MAPS/TG_Walkthrough.splat \
      --max-scale 0.5 --min-alpha 0.02 --max-aniso 8 --max-splats 750000

-> 750,000 splats, 22.89 MB, 260,342 needles dropped.
Captures: `scratch/s14a-renders/TG-cleaned2/`.

## Verdict: NOT SHIPPED

Before: `scratch/s14a-peek/TG-stop-04.png`
After (wrong metric): `scratch/s14a-renders/TG-cleaned/TG-stop-04.png`
After (right metric): `scratch/s14a-renders/TG-cleaned2/TG-stop-04.png`

The corrected prune is a real improvement on the broken one and a marginal
improvement on the original. It does not make the reel family-showable. The
spike field is not a scatter of outlier splats sitting near a good surface —
it IS the model's representation of the turf over ground-level memorial
markers, and no amount of removing splats recovers a surface the footage never
resolved. Removing them harder only exposes the void behind.

`MAPS/TG_Walkthrough.splat` therefore ships as the ORIGINAL, uncleaned
conversion of `TG_30000.ply`. Terrace Garden waits for the re-shoot protocol in
`ops/sprints/sprint-14/RESEARCH-outdoor-photoreels.md`.
