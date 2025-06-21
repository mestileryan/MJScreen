using Microsoft.EntityFrameworkCore;

namespace MJScreen.Api.Models;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Playlist> Playlists => Set<Playlist>();
    public DbSet<Track> Tracks => Set<Track>();
}
