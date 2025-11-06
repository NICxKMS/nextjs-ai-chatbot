# Upstash Redis Migration Checklist

## ✅ Pre-Deployment

- [ ] Create Upstash Redis database (free tier available at upstash.com)
- [ ] Add environment variables to `.env.local` (dev) or Vercel (prod):
  ```bash
  UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
  UPSTASH_REDIS_REST_TOKEN=your_token_here
  ```
- [ ] Test locally with `pnpm dev`
- [ ] Verify console shows: "✅ Upstash Redis client initialized"

## ✅ Testing

- [ ] Create a new chat → Should save to both cache and database
- [ ] Refresh page → Should load from cache (faster)
- [ ] Send messages → Should update cache immediately
- [ ] Try guest mode → Should work cache-only
- [ ] Check Upstash dashboard → Should see keys populated

## ✅ Deployment

- [ ] Push code to repository
- [ ] Deploy to Vercel: `vercel deploy`
- [ ] Verify environment variables in Vercel dashboard
- [ ] Test production deployment
- [ ] Monitor Redis usage in Upstash dashboard

## ✅ Post-Deployment Verification

- [ ] Cache hit rate increasing over time
- [ ] Response times improved (check Vercel Analytics)
- [ ] Database queries reduced (check PostgreSQL metrics)
- [ ] No errors in Vercel logs
- [ ] Guest users working correctly

## 🎯 Expected Improvements

### Performance
- **First chat load**: ~200ms (cache miss + warming)
- **Subsequent loads**: <50ms (cache hit)
- **Message send**: Immediate user response (parallel write)

### Database Load
- **Before**: Every request hits PostgreSQL
- **After**: 10-20% of requests hit PostgreSQL (cache hits)

### Guest Users
- **Before**: All writes to PostgreSQL
- **After**: Zero PostgreSQL writes for guests

## 📊 Monitoring

### Upstash Dashboard
- Track memory usage
- Monitor command count
- Check latency metrics

### Vercel Logs
- Watch for Redis connection errors
- Verify no fallback warnings
- Monitor API response times

## 🔧 Troubleshooting

### Redis Not Connecting
```bash
# Check environment variables
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# Verify in Vercel dashboard
```

### Cache Not Working
- Check console for "Upstash Redis not configured" warning
- Verify environment variables are set
- Restart development server

### High Memory Usage
- Check for memory leaks in Upstash dashboard
- Consider adding TTL for inactive chats
- Review cache key counts

## 📚 Documentation

- Full guide: [docs/upstash-redis-implementation.md](docs/upstash-redis-implementation.md)
- Cache module: [lib/cache/README.md](lib/cache/README.md)
- Upstash docs: https://upstash.com/docs/redis

## 🚀 Optional Enhancements

- [ ] Add cache metrics tracking
- [ ] Implement TTL for inactive guest chats
- [ ] Add compression for large payloads
- [ ] Set up multi-region replication (Upstash Pro)
- [ ] Create monitoring dashboard

## ✨ Features Enabled

✅ **Cache-first reads** - Faster response times  
✅ **Parallel writes** - No user-perceived latency  
✅ **Denormalized structure** - Single request chat loading  
✅ **Guest optimization** - Cache-only storage  
✅ **Simplified streaming** - Removed resumable streams  
✅ **Edge-optimized** - Perfect for Vercel Fluid Compute  

## Notes

- Implementation is backward-compatible
- Graceful degradation if Redis unavailable
- No data migration required (cache warms automatically)
- Guest users require Redis to be available
