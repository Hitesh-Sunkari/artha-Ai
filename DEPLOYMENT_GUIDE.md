# ArthaAI Free Cloud Production Deployment Guide
**Target Cost:** **₹0 / Month ($0.00)**  
**Version:** 1.0.0-PROD  
**Classification:** DevOps Implementation Runbook  

---

## 1. Introduction & Architecture Selection

This guide details step-by-step instructions to deploy **ArthaAI** on genuinely free cloud infrastructure without hidden charges, trial-credit cliffs, or simulated agents.

### Selected Free Cloud Platforms
1. **Option 1: Oracle Cloud Always Free (Dedicated Linux ARM64 VM) [RECOMMENDED]**
   - **Specs:** 4 ARM Ampere vCPUs, 24 GB RAM, 200 GB permanent block storage, static public IPv4.
   - **Cost:** Permanent ₹0.00/month indefinitely.
   - **Credit Card:** Required for signup verification only ($1 temporary fraud-prevention hold).
   - **Deployment Mechanism:** Multi-container Docker Compose (`compose.yaml` / `docker-compose.yml`).
   - **Zero Sleep:** Runs 24/7/365 with zero cold starts, zero timeouts, and full persistent volume storage.

2. **Option 2: Decoupled Hybrid (Vercel / Cloudflare Edge + Oracle / GCP Backend)**
   - **Specs:** Frontends hosted on global edge CDN with automated Let's Encrypt HTTPS; backend hosted on free cloud VM.
   - **Cost:** Permanent ₹0.00/month.
   - **Credit Card:** Not required for Vercel/Cloudflare.
   - **Deployment Mechanism:** Git push to Vercel/Cloudflare Pages with `VITE_API_URL` pointing to backend VM.

3. **Option 3: Google Cloud Always Free `e2-micro` (1 GB RAM VM with 2 GB Swap)**
   - **Specs:** 1 `e2-micro` instance, 1 GB RAM, 30 GB standard persistent disk (US regions `us-central1`, `us-west1`, `us-east1`).
   - **Cost:** Permanent ₹0.00/month within free tier usage limits.
   - **Credit Card:** Required for GCP account activation.
   - **Deployment Mechanism:** Docker Compose stack with a configured 2 GB Linux swap file.

4. **Option 4: Single Container on Hugging Face Spaces / Render (PaaS)**
   - **Specs:** Unified single container running on Port 7860/8000.
   - **Cost:** Permanent ₹0.00/month.
   - **Deployment Mechanism:** Root `Dockerfile` multi-stage build.

---

## 2. Option A: Hugging Face Spaces Deployment (Recommended)

Hugging Face Spaces provides the fastest, most reliable deployment with 16 GB RAM and zero payment details required.

### Step 1: Create a Free Hugging Face Account
1. Visit [huggingface.co](https://huggingface.co/) and sign up for a free account.
2. Confirm your email address.

### Step 2: Create a New Space
1. Click **New Space** (`https://huggingface.co/new-space`).
2. Enter Space Name: `arthai` (or `arthai-terminal`).
3. License: `mit` or `apache-2.0`.
4. Space SDK: Select **Docker** -> **Blank**.
5. Space Hardware: Choose **CPU Basic (Free - 2 vCPU, 16 GB RAM)**.
6. Visibility: **Public** (or Private if you prefer).
7. Click **Create Space**.

### Step 3: Configure Environment Secrets
In your newly created Space:
1. Navigate to **Settings** -> **Variables and secrets**.
2. Click **New secret** and add:
   - Name: `GEMINI_API_KEY`
   - Value: `[Your Google Gemini API Key from aistudio.google.com]`
3. (Optional) Add `OPENAI_API_KEY` if using OpenAI as secondary provider:
   - Name: `OPENAI_API_KEY`
   - Value: `[Your OpenAI API Key]`
4. Add Environment Variable:
   - Name: `ARTHAAI_ENVIRONMENT`
   - Value: `production`
   - Name: `PORT`
   - Value: `7860`

### Step 4: Push the ArthaAI Repository
Clone your space repository and push the ArthaAI files:
```bash
# Clone the empty HF Space repo
git clone https://huggingface.co/spaces/<your-username>/arthai
cd arthai

# Copy all files from ArthaAI into the space directory
# Ensure root Dockerfile, pyproject.toml, src/, frontend/, admin-frontend/, data/ are present

git add .
git commit -m "Deploy ArthaAI Production Stack"
git push origin main
```

### Step 5: Verify Deployment
Hugging Face Spaces automatically runs the multi-stage build:
1. Stage 1 builds the React frontend.
2. Stage 2 builds the React admin portal.
3. Stage 3 bundles Python 3.12, FastMCP, DuckDB, ChromaDB, and starts uvicorn on port `7860`.
4. Your public URL is immediately live:  
   `https://<your-username>-arthai.hf.space`
5. The admin portal is accessible at:  
   `https://<your-username>-arthai.hf.space/admin`

---

## 3. Option B: Oracle Cloud Always Free (Dedicated VM)

### Step 1: Provision Always Free Compute Instance
1. Log in to [cloud.oracle.com](https://cloud.oracle.com/).
2. In the navigation menu, select **Compute** -> **Instances** -> **Create Instance**.
3. **Image:** Ubuntu 24.04 LTS (Canonical).
4. **Shape:** Click **Change Shape** -> Select **Ampere (ARM Processor)** -> `VM.Standard.A1.Flex`:
   - Number of OCPUs: `2` (or up to `4`)
   - Amount of Memory: `12 GB` (or up to `24 GB`)
   - *Note: This shape is labeled "Always Free Eligible".*
5. **Networking:** Assign a public IPv4 address.
6. **SSH Keys:** Save your private key and upload your public key.
7. Click **Create**.

### Step 2: Open Security Ingress Ports
1. In the OCI Console, navigate to **Virtual Cloud Networks** -> your VCN -> **Security Lists** -> Default Security List.
2. Click **Add Ingress Rules**:
   - Source CIDR: `0.0.0.0/0`
   - Destination Port: `80, 443`
   - Protocol: `TCP`
3. In your VM SSH terminal, open host firewall ports:
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

### Step 3: Install Docker & Docker Compose
Connect via SSH:
```bash
ssh -i /path/to/your-key.pem ubuntu@<your-vm-ip>

# Install Docker
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
newgrp docker
```

### Step 4: Clone Repository and Deploy Compose Stack
```bash
git clone https://github.com/<your-repo>/ArthAI.git
cd ArthAI

# Configure production .env
cp .env.example .env
nano .env
# Set GEMINI_API_KEY, ARTHAAI_ALLOWED_ORIGINS=*, etc.

# Build and start services in the background
docker compose up -d --build

# Verify healthy startup
docker compose ps
curl http://127.0.0.1:80/health
```

### Step 5: Configure Free SSL via Let's Encrypt (Optional Free Domain)
If using DuckDNS or a free domain:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
# Certbot automatically issues and renews free SSL certificates
```

---

## 4. Option C: Google Cloud Always Free `e2-micro` (1 GB RAM)

### Step 1: Provision Free `e2-micro` VM
1. Go to [console.cloud.google.com](https://console.cloud.google.com/).
2. Navigate to **Compute Engine** -> **VM instances** -> **Create Instance**.
3. **Region:** Choose `us-central1` (Iowa), `us-west1` (Oregon), or `us-east1` (S. Carolina) — *these are the Always Free regions*.
4. **Machine Configuration:** Series `E2` -> Machine type `e2-micro` (2 vCPU burstable, 1 GB RAM).
5. **Boot disk:** Standard persistent disk, 30 GB, Ubuntu 24.04 LTS.
6. **Firewall:** Check **Allow HTTP traffic** and **Allow HTTPS traffic**.
7. Click **Create**.

### Step 2: Configure 2 GB Swap File (Crucial for 1 GB RAM)
Because `e2-micro` has only 1 GB RAM, creating a 2 GB swap file prevents out-of-memory errors:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Step 3: Run the Pre-Built Docker Container
```bash
# Install Docker and clone repo
sudo apt-get update && sudo apt-get install -y docker.io git
sudo usermod -aG docker $USER

git clone https://github.com/<your-repo>/ArthAI.git
cd ArthAI
cp .env.example .env
nano .env

# Run single container bound to port 80
docker build -t arthai-app .
docker run -d --name arthai \
  --restart unless-stopped \
  -p 80:7860 \
  --env-file .env \
  arthai-app
```

---

## 5. Operations & Maintenance

### Starting and Stopping Services
```bash
# Docker Compose
docker compose start
docker compose stop
docker compose restart

# View running container health
docker compose ps
```

### Viewing Logs in Real Time
```bash
# Backend logs
docker logs -f arthaai-backend

# Frontend / Nginx logs
docker logs -f arthaai-frontend
```

### Updating to the Latest Code
```bash
git pull origin main
docker compose up -d --build
```

### Decommissioning Cloud Resources (To Avoid Unexpected Costs)
- **Hugging Face:** Go to Space Settings -> **Delete Space**. (Instant, 0 charges).
- **Oracle Cloud:** Go to Instance -> **Terminate** -> Check "Permanently delete attached Boot Volume".
- **Google Cloud:** Go to Compute Engine -> Select VM -> Click **Delete**.

