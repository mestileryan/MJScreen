using Microsoft.EntityFrameworkCore;
using MJScreen.Api.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=app.db"));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.UseHttpsRedirection();

app.MapGet("/api/playlists", async (AppDbContext db) =>
    await db.Playlists.ToListAsync());

app.MapPost("/api/playlists", async (Playlist pl, AppDbContext db) =>
{
    db.Playlists.Add(pl);
    await db.SaveChangesAsync();
    return Results.Ok(new { id = pl.Id });
});

app.MapPut("/api/playlists/{id}", async (int id, Playlist pl, AppDbContext db) =>
{
    var existing = await db.Playlists.FindAsync(id);
    if (existing is null) return Results.NotFound();
    existing.Name = pl.Name;
    existing.Width = pl.Width;
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapDelete("/api/playlists/{id}", async (int id, AppDbContext db) =>
{
    var existing = await db.Playlists.FindAsync(id);
    if (existing is null) return Results.NotFound();
    db.Playlists.Remove(existing);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapGet("/api/tracks", async (AppDbContext db) =>
    await db.Tracks.ToListAsync());

app.MapPost("/api/tracks", async (Track track, AppDbContext db) =>
{
    db.Tracks.Add(track);
    await db.SaveChangesAsync();
    return Results.Ok(new { id = track.Id });
});

app.MapPut("/api/tracks/{id}", async (int id, Track track, AppDbContext db) =>
{
    var existing = await db.Tracks.FindAsync(id);
    if (existing is null) return Results.NotFound();

    existing.Name = track.Name;
    existing.InitialVolume = track.InitialVolume;
    existing.IconName = track.IconName;
    existing.IconColor = track.IconColor;
    existing.Order = track.Order;
    existing.PlaylistId = track.PlaylistId;
    existing.Loop = track.Loop;
    existing.ContentType = track.ContentType;
    existing.Data = track.Data;
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapDelete("/api/tracks/{id}", async (int id, AppDbContext db) =>
{
    var existing = await db.Tracks.FindAsync(id);
    if (existing is null) return Results.NotFound();
    db.Tracks.Remove(existing);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.Run();
