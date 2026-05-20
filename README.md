# XRMemory.org

Static website for the XRMemory workshop series.

## Local preview

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## GitHub Pages setup

1. Create a GitHub repository, for example `xrmemory/xrmemory.github.io`.
2. Push this folder to the repository's default branch.
3. In GitHub, enable Pages from the repository root.
4. Point the `xrmemory.org` DNS records to GitHub Pages.

Suggested DNS records:

```text
Type  Name  Value
A     @     185.199.108.153
A     @     185.199.109.153
A     @     185.199.110.153
A     @     185.199.111.153
CNAME www   xrmemory.github.io
```

The `CNAME` file in this repository sets the custom domain to `xrmemory.org`.
