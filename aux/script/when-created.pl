#!/usr/bin/env perl

use strict;
use warnings;
use POSIX qw(strftime);
use Date::Parse qw(strptime);
use Data::Dumper;

for my $file(@ARGV) {
    my $id_to_date = scrape_history($file);

    in_place($file, sub {
        my $json = shift;
        $json =~ s/^(( *)"id" *: *"(\S+)")/$1,\n$2"created_at": "$id_to_date->{$3}"/gm;
        return $json;
    });
};




sub in_place {
    my ($name, $change) = @_;
    return if -d $name;

    my $backup = $name.".orig";

    open (my $fd, "<", $name) || die "Couldn't open(r) $name: $!";
    rename $name, $backup || die "Couldn't make backup $backup: $!";

    eval {
        local $/;
        local $_ = <$fd>;
        close $fd;

        $_ = $change->($_);

        open (my $out, ">", $name) || die "Couldn't open(w) $name: $!";
        print $out $_ || die "Failed to write $name: $!";
        close $out || die "Failed to sync $name: $!";

        unlink $backup || warn "Failed to erase $backup: $!";
    } || do {
        rename $backup, $name || warn "Failed to move $backup to $name: $!";
        die $@;
    }
}

sub scrape_history {
    my $file = shift;

    my @hist = qx(git log -p --follow -- "$file");

    my %id_to_date;
    my $commit_date;
    for (@hist) {
        if (/^[A-Z]/ and my $date = fix_date($_)) {
            # found a commit, replace the date
            $commit_date = $date;
            next;
        }

        if (/^\+ *"id" *: *"(\S+)"/) {
            # found an id added, store the date for it
            $id_to_date{$1} = $commit_date;
        }
    }

    return \%id_to_date;
}

sub fix_date {
    my $date = shift;
    $date =~ s/(\+\d+).*/$1/; # trim by timezone
    return strftime "%Y-%m-%dT%H:%M:%S", strptime($date)
}
