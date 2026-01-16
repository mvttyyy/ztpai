import { HeroSection } from '@/components/home/hero-section';
import { TrendingLoops } from '@/components/home/trending-loops';
import { RecentLoops } from '@/components/home/recent-loops';
import { PopularTags } from '@/components/home/popular-tags';

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8 pb-8">
      <HeroSection />
      
      <div className="container">
        <div className="grid gap-8">
          {/* Trending Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold tracking-tight">
                🔥 Trending This Week
              </h2>
              <a href="/browse?sort=trending" className="text-sm text-primary hover:underline">
                View all
              </a>
            </div>
            <TrendingLoops />
          </section>

          {/* Popular Tags */}
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4">
              Browse by Tags
            </h2>
            <PopularTags />
          </section>

          {/* Recent Loops */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold tracking-tight">
                ✨ Recently Added
              </h2>
              <a href="/browse?sort=newest" className="text-sm text-primary hover:underline">
                View all
              </a>
            </div>
            <RecentLoops />
          </section>
        </div>
      </div>
    </div>
  );
}
