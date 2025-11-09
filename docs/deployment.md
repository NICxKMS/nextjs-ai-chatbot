# Deployment

Production deployment, monitoring, and operations.

## Production Setup

### Platform: Vercel (Recommended)

#### 1. Project Configuration

```bash
# Deploy to Vercel
vercel --prod

# Or connect GitHub repository for auto-deploys
```

#### 2. Environment Variables

```bash
# Production URLs
DATABASE_URL="postgresql://neon-db-url"
CACHE_KV_REST_API_URL="https://redis-url"
CACHE_KV_REST_API_TOKEN="redis-token"

# Authentication
NEXTAUTH_SECRET="production-secret"
NEXTAUTH_URL="https://your-domain.com"

# AI Providers
OPENAI_API_KEY="sk-production-key"
ANTHROPIC_API_KEY="sk-ant-production-key"
```

#### 3. Build Configuration

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

### Database: Neon PostgreSQL

#### Setup

1. Create Neon project at [neon.tech](https://neon.tech)
2. Copy connection string to Vercel env vars
3. Run migrations: `pnpm db:push`

#### Connection Pooling

```typescript
// Optimized for Vercel Fluid Compute
const getPoolConfig = () => {
  const isVercelFluid = process.env.VERCEL_FLUID === "1";
  return isVercelFluid
    ? { max: 5, idle_timeout: 10 }
    : { max: 10, idle_timeout: 20 };
};
```

### Cache: Upstash Redis

#### Setup

1. Create Redis database at [upstash.com](https://upstash.com)
2. Configure REST URL and token
3. Test connection: `curl -X GET "$CACHE_KV_REST_API_URL/ping"`

#### Configuration

```typescript
// Global singleton for serverless
const redis = new Redis({
  url: process.env.CACHE_KV_REST_API_URL,
  token: process.env.CACHE_KV_REST_API_TOKEN,
});
```

## Performance Configuration

### Vercel Fluid Compute

```typescript
// API route configuration
export const runtime = "nodejs";
export const maxDuration = 30; // seconds
export const dynamic = "force-dynamic";
```

### Next.js Optimizations

```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@radix-ui/react-icons",
    ],
    inlineCss: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
};
```

### Bundle Optimization

```bash
# Analyze bundle size
pnpm build --analyze

# Core Web Vitals
# Lighthouse score should be >90 for all categories
```

## Security Configuration

### Authentication

```typescript
// auth.config.ts
export const authConfig: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true, // Required for Vercel
  useSecureCookies: process.env.NODE_ENV === "production",
};
```

### Security Headers

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}
```

### Rate Limiting

```typescript
// Enforced via Redis counters
const userQuota = await getUserMessageCount(userId);
if (userQuota >= DAILY_LIMIT) {
  throw new ChatSDKError("rate_limit:chat:daily_limit_exceeded");
}
```

## Monitoring

### OpenTelemetry Setup

```typescript
// instrumentation.ts
import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel("nextjs-ai-chatbot");
}
```

### Key Metrics

- **Performance**: TTFB, LCP, CLS, FID
- **Business**: Messages per user, session duration
- **Technical**: Cache hit rate, DB query time, error rate
- **Cost**: Compute usage, Redis operations, API calls

### Error Tracking

```typescript
// Structured logging
logError("Redis operation failed", {
  operation: "getChatFromCache",
  chatId,
  userId,
  error: error.message,
});
```

## Scaling Considerations

### Database Scaling

- **Connection Pooling**: Optimized for serverless
- **Query Optimization**: Indexed for common patterns
- **Read Replicas**: For high read workloads

### Cache Scaling

- **Pipeline Operations**: Reduce round-trips
- **Intelligent Warming**: Background population
- **TTL Management**: Automatic cleanup

### CDN Configuration

```typescript
// Static asset optimization
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.blob.vercel-storage.com",
      },
    ],
  },
};
```

## Deployment Checklist

### Pre-Deployment

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Redis connection verified
- [ ] Build completes successfully
- [ ] All tests pass
- [ ] Linter passes

### Post-Deployment

- [ ] Application loads correctly
- [ ] Authentication flow works
- [ ] Chat functionality tested
- [ ] AI responses working
- [ ] Error monitoring active
- [ ] Performance metrics tracked

## Troubleshooting

### Common Issues

#### Database Connection

```bash
# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

#### Redis Connection

```bash
# Test Redis
curl -X GET "$CACHE_KV_REST_API_URL/ping" \
  -H "Authorization: Bearer $CACHE_KV_REST_API_TOKEN"
```

#### Build Errors

```bash
# Clear build cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### Performance Issues

```bash
# Check Core Web Vitals
# Vercel Analytics → Speed Insights

# Monitor API response times
# Vercel Analytics → Functions
```

### Debug Mode

```typescript
// Enable debug logging
export const DEBUG = process.env.NODE_ENV === "development";

export function debugLog(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data);
  }
}
```

## Maintenance

### Regular Tasks

- **Daily**: Monitor error rates, check performance metrics
- **Weekly**: Update dependencies, review security advisories
- **Monthly**: Database maintenance, cache cleanup, performance audit

### Backup Strategy

- **Database**: Neon provides point-in-time recovery
- **Cache**: Redis is ephemeral (rebuildable from DB)
- **Code**: Git version control with releases

### Cost Optimization

- **Compute**: Right-size Vercel functions
- **Database**: Optimize queries, use connection pooling
- **Cache**: Efficient key patterns, appropriate TTLs

## Environment Management

### Staging Environment

```bash
# Separate staging project
vercel --scope team-name --project chatbot-staging

# Staging environment variables
DATABASE_URL="staging-db-url"
CACHE_KV_REST_API_URL="staging-redis-url"
```

### Blue-Green Deployment

```bash
# Deploy to preview environment
vercel --prod

# Test thoroughly
# Route traffic to new version
# Monitor for issues
# Full rollout if stable
```

## Compliance

### Data Privacy

- **GDPR**: User data deletion capabilities
- **CCPA**: Data access and deletion rights
- **SOC 2**: Security controls and monitoring

### Security Best Practices

- **Encryption**: TLS 1.3 for all traffic
- **Authentication**: Secure session management
- **Authorization**: Role-based access control
- **Audit**: Comprehensive logging and monitoring
