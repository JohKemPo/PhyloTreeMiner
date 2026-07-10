# PhyloTreeMiner

[Official CLI workflow documentation](https://github.com/JohKemPo/BioComp_UFF/tree/main/README.md)

⚠️ **To clone the repository and its submodules:** ⚠️

```bash
git clone --recursive https://github.com/UFFeScience/phylotreeminer.git
```
 

# Initial Dependencies

The `start.sh` script was created to automate *project setup*, but it relies on some base tools that need to exist on the system.

Here is a dependency guide, divided between what **you** must install (System) and what **the script** installs (Project).

-----

##   1. System Dependencies (Prerequisites)

These are the tools that your **Ubuntu** system must have **before** you run `./start.sh --setup` for the first time. Without them, the script will fail.

  * **`git`**: To clone the repository and get project files.
  * **`curl`**: The script uses `curl` to download the Miniconda installer (if it doesn't find `conda`).
  * **`nodejs` and `npm`**: The script uses `npm` to install frontend dependencies. It checks if `npm` exists but does not install it.

###  Installation Command (Ubuntu)

To install all these prerequisites at once:

```bash
sudo apt update
sudo apt install git curl nodejs npm -y
```

-----

##  2. Project Dependencies (Managed by Script)

If you run the script with the `--setup` flag, it will handle **all** of the following dependencies. You don't need to install them manually.

  * **Environment Manager:** `Miniconda`

      * The script automatically downloads and installs Miniconda if the `conda` command is not found.

  * **Python Version:** `Python 3.10`

      * The script **creates** a conda environment named `Phylotreeminer` and specifies `python=3.10` for it.

  * **Python Libraries (pip):**

      * The script installs all libraries listed in the `requirements.txt` file. Based on your log, this includes:
          * `fastapi`, `uvicorn` (for backend)
          * `pandas`, `numpy` (for data analysis)
          * `biopython`, `dendropy`, `mlxtend` (for bioinformatics)
          * `neo4j` (Python driver to connect to Neo4j database)

  * **Bioinformatics Tools (conda):**

      * The script installs a suite of heavy-duty phylogeny tools using `bioconda`:
          * `clustalo`
          * `mafft`
          * `iq-tree`
          * `fasttree`
          * `raxml-ng`
          * `mrbayes`

  * **Frontend Libraries (npm):**

      * The script runs `npm install` in the `Frontend/phylotreeminer` directory, installing packages like `react` and `vite` (listed in `package.json`).

# Quick Start Guide

**0. Give the script execute permission.:**
```bash
chmod +x start.sh
```


**1. First-time setup (install all dependencies):**
```bash
./start.sh --setup
```

**2. Run application (after dependencies are installed):**
```bash
./start.sh
```

**Note:** The setup process may take several minutes as it downloads and installs all required bioinformatics tools and dependencies.
