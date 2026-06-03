# Changelog

## v0.2.2 - 2026-06-03

- new fixes (cd98495)


## v0.2.1 - 2026-06-03

- changes (9334e11)
- Merge branch 'develop' into main (740406c)
- changes in workflew (2f44750)


## v0.2.0 - 2026-06-03

- Merge pull request #11 from Nawazish12/develop (4dc9493)
- Add release-driven production deployment flow (f2e92ca)
- Update auth layout text for staging deployment verification (96a38fd)
- Fix client IP detection behind CloudFront+ALB for auth rate limiting (c60ca9c)
- Merge pull request #10 from Nawazish12/feature/trust-proxy-fix (5bd6a90)
- Set trust proxy=1 + temp client-IP log for verification (dd6d2bc)
- Merge pull request #9 from Nawazish12/feature/prod-environment (5d2227c)
- Add production environment: Terraform infra + promote-by-tag deploy workflow (cf0de75)
- Merge pull request #8 from Nawazish12/feature/health-env (406edd1)
- feat(backend): expose env name in /health response (664d19f)
- Merge pull request #7 from Nawazish12/feature/staging-deploy-pipeline (b7670ff)
- feat(cicd): staging deploy via GitHub Actions + OIDC (ae0e8e6)
- Merge pull request #6 from Nawazish12/feature/infra-terraform-foundation (75b9ec3)
- feat(infra): staging ECS task def + service (backend/worker/redis) (71adffd)
- feat(infra): staging frontend - private S3 + CloudFront (b39b7b1)
- feat(infra): staging backend ALB (HTTP, CloudFront origin) (9bc6fa8)
- feat(infra): staging ECS cluster + t3.micro EC2 instance (88811c2)
- feat(infra): staging security groups + IAM roles (5aef0a1)
- feat(infra): scaffold Terraform + ECR backend repository (6150627)
- Merge pull request #5 from Nawazish12/feature/frontend-s3-cloudfront-plan (deda8f7)
- docs: switch frontend hosting to S3 + CloudFront (af16f63)
- Merge pull request #4 from Nawazish12/feature/local-prod-parity (1def235)
- chore: add local prod-parity compose; sync CI policy in DEPLOYMENT.md (f679ca3)
- Merge pull request #3 from Nawazish12/feature/ci-pipeline (ce1f82f)
- fix(frontend): apk upgrade nginx base to patch CRITICAL OpenSSL CVE (f0c54d2)
- ci: gate on CRITICAL only, report HIGH as non-blocking (7765fe8)
- ci: run Trivy via official aquasec/trivy image instead of the action (e20bd05)
- ci: also run both service checks when the workflow itself changes (c2510aa)
- ci: add quality-gate workflow for backend and frontend (86c7294)
- Merge pull request #2 from Nawazish12/feature/dockerize-prod (2129e0a)
- build: add production multi-stage Docker images for all services (57fe206)
- Merge pull request #1 from Nawazish12/develop (b678e22)
- remove docs folder (df4a28e)
- chore: initial commit of existing project (07a9d83)

